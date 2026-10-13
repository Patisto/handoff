-- Transaction-local settings are bound by the application with set_config(..., true).
-- FORCE prevents accidental table-owner bypass; the runtime role must also lack BYPASSRLS.
CREATE FUNCTION app_manager() RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT COALESCE(current_setting('app.current_role', true), '') = 'MANAGER'
$$;
CREATE FUNCTION app_user() RETURNS text LANGUAGE sql STABLE AS $$
 SELECT NULLIF(current_setting('app.current_user_id', true), '')
$$;
CREATE FUNCTION app_department(dept text) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS (SELECT 1 FROM user_departments WHERE "userId" = app_user() AND "departmentId" = dept)
$$;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks FORCE ROW LEVEL SECURITY;
CREATE POLICY task_read ON tasks FOR SELECT USING (app_manager() OR app_department("departmentId"));
CREATE POLICY task_insert ON tasks FOR INSERT WITH CHECK (app_manager());
CREATE POLICY task_update ON tasks FOR UPDATE USING (app_manager() OR app_department("departmentId")) WITH CHECK (app_manager() OR app_department("departmentId"));
CREATE POLICY task_delete ON tasks FOR DELETE USING (app_manager());
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;
CREATE POLICY project_read ON projects FOR SELECT USING (app_manager() OR EXISTS (SELECT 1 FROM tasks WHERE "projectId" = projects.id));
CREATE POLICY project_write ON projects FOR ALL USING (app_manager()) WITH CHECK (app_manager());
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments FORCE ROW LEVEL SECURITY;
CREATE POLICY comment_read ON comments FOR SELECT USING (app_manager() OR EXISTS (SELECT 1 FROM tasks WHERE id = comments."taskId"));
CREATE POLICY comment_insert ON comments FOR INSERT WITH CHECK (app_manager() OR ("userId" = app_user() AND EXISTS (SELECT 1 FROM tasks WHERE id = comments."taskId")));
CREATE POLICY comment_delete ON comments FOR DELETE USING (app_manager() OR ("userId" = app_user() AND EXISTS (SELECT 1 FROM tasks WHERE id = comments."taskId")));
ALTER TABLE files ADD CONSTRAINT file_scope CHECK (("taskId" IS NOT NULL AND "projectId" IS NULL) OR ("projectId" IS NOT NULL AND "taskId" IS NULL AND "commentId" IS NULL));
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE files FORCE ROW LEVEL SECURITY;
CREATE POLICY file_read ON files FOR SELECT USING (app_manager() OR EXISTS (SELECT 1 FROM tasks WHERE id = files."taskId") OR EXISTS (SELECT 1 FROM projects WHERE id = files."projectId"));
CREATE POLICY file_insert ON files FOR INSERT WITH CHECK (app_manager() OR ("uploaderId" = app_user() AND (EXISTS (SELECT 1 FROM tasks WHERE id = files."taskId") OR EXISTS (SELECT 1 FROM projects WHERE id = files."projectId"))));
CREATE POLICY file_delete ON files FOR DELETE USING (app_manager());
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
CREATE POLICY notification_read ON notifications FOR SELECT USING (app_manager() OR "userId" = app_user());
CREATE POLICY notification_update ON notifications FOR UPDATE USING (app_manager() OR "userId" = app_user()) WITH CHECK (app_manager() OR "userId" = app_user());
-- Notifications are produced by trusted application services, never by a public create endpoint.
CREATE POLICY notification_insert ON notifications FOR INSERT WITH CHECK (app_user() IS NOT NULL);
ALTER TABLE activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity FORCE ROW LEVEL SECURITY;
CREATE POLICY activity_read ON activity FOR SELECT USING (app_manager() OR CASE WHEN "taskId" IS NOT NULL THEN EXISTS (SELECT 1 FROM tasks WHERE id = activity."taskId") ELSE EXISTS (SELECT 1 FROM projects WHERE id = activity."projectId") END);
CREATE POLICY activity_insert ON activity FOR INSERT WITH CHECK (app_manager() OR ("actorId" = app_user() AND (EXISTS (SELECT 1 FROM tasks WHERE id = activity."taskId") OR ("taskId" IS NULL AND EXISTS (SELECT 1 FROM projects WHERE id = activity."projectId")))));
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
CREATE INDEX IF NOT EXISTS "tasks_departmentId_idx" ON tasks("departmentId");
CREATE INDEX IF NOT EXISTS "tasks_assigneeId_idx" ON tasks("assigneeId");
CREATE INDEX IF NOT EXISTS tasks_deadline_idx ON tasks(deadline);
CREATE INDEX IF NOT EXISTS "tasks_projectId_idx" ON tasks("projectId");
CREATE INDEX IF NOT EXISTS "comments_taskId_idx" ON comments("taskId");
CREATE INDEX IF NOT EXISTS "files_taskId_idx" ON files("taskId");
CREATE INDEX IF NOT EXISTS "notifications_userId_read_idx" ON notifications("userId",read);
CREATE INDEX IF NOT EXISTS "activity_projectId_idx" ON activity("projectId");
CREATE INDEX IF NOT EXISTS "activity_taskId_idx" ON activity("taskId");
-- Provision the runtime role outside migrations in production (see infra/init.sql).
GRANT USAGE ON SCHEMA public TO handoff_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO handoff_app;
REVOKE ALL ON _prisma_migrations FROM handoff_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO handoff_app;
