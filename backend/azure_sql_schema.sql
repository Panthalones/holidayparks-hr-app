CREATE TABLE audit_logs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    action NVARCHAR(100) NOT NULL,
    description NVARCHAR(MAX) NOT NULL,
    performed_by NVARCHAR(255) NOT NULL,
    target_user_id NVARCHAR(255) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
