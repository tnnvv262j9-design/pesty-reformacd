<?php
// api/update_database_client_portal.php
header('Content-Type: application/json');
include 'db_connect.php';

// Enable error reporting
ini_set('display_errors', 1);
ini_set('log_errors', 1);
error_reporting(E_ALL);

$response = ['success' => false, 'messages' => []];

try {
    // Add access_code column to clients table if it doesn't exist
    $check_col = $conn->query("SHOW COLUMNS FROM clients LIKE 'access_code'");
    if ($check_col->num_rows == 0) {
        $sql = "ALTER TABLE clients ADD COLUMN access_code VARCHAR(20) DEFAULT NULL";
        if ($conn->query($sql) === TRUE) {
            $response['messages'][] = "Column 'access_code' added to 'clients' table.";
            
            // Add unique index to ensure codes are unique (optional but good practice)
            // Using a simple index for now, enforcing uniqueness in application logic might be safer if we allow nulls
            $conn->query("ALTER TABLE clients ADD INDEX idx_access_code (access_code)");
        } else {
            throw new Exception("Error adding column 'access_code': " . $conn->error);
        }
    } else {
        $response['messages'][] = "Column 'access_code' already exists.";
    }

    $response['success'] = true;

} catch (Exception $e) {
    $response['error'] = $e->getMessage();
}

echo json_encode($response);
$conn->close();
?>