<?php
// api/admin/check_admin_auth.php
// Helper para validar que quien llama es el superadmin

function validateSuperAdmin($conn, $requester_id) {
    if (!$requester_id) return false;
    
    $stmt = $conn->prepare("SELECT admin_code FROM companies WHERE id = ?");
    $stmt->bind_param("i", $requester_id);
    $stmt->execute();
    $res = $stmt->get_result();
    
    if ($row = $res->fetch_assoc()) {
        return $row['admin_code'] === 'GEMAR_ADMIN';
    }
    return false;
}
?>
