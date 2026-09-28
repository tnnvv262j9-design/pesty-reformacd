<?php

function ensure_audit_log_table($conn) {
    if (!$conn) {
        return;
    }
    $sql = "CREATE TABLE IF NOT EXISTS audit_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        user_id INT DEFAULT NULL,
        module VARCHAR(100) NOT NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100) DEFAULT NULL,
        entity_id INT DEFAULT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (company_id),
        INDEX (user_id),
        INDEX (module),
        INDEX (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    $conn->query($sql);
}

function log_audit_event($conn, $companyId, $userId, $module, $action, $entityType, $entityId, $description) {
    if (!$conn) {
        return;
    }
    ensure_audit_log_table($conn);
    $stmt = $conn->prepare("INSERT INTO audit_log (company_id, user_id, module, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)");
    if (!$stmt) {
        return;
    }
    $stmt->bind_param(
        "iisssis",
        $companyId,
        $userId,
        $module,
        $action,
        $entityType,
        $entityId,
        $description
    );
    $stmt->execute();
    $stmt->close();
}

?>
