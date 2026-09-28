<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

function handle_fatal_error() {
    $error = error_get_last();
    if ($error !== NULL && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        ob_clean();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error fatal: ' . $error['message']]);
        exit();
    }
}
register_shutdown_function('handle_fatal_error');

try {
    include 'db_connect.php';
    $conn->query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
} catch (Exception $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error de conexión a la base de datos']);
    exit();
}

$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;

if (empty($company_id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'company_id es requerido']);
    exit();
}

    // AUTO-FIX: Asegurar que la tabla documents exista
    $create_table_sql = "CREATE TABLE IF NOT EXISTS documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) DEFAULT 'Otros',
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        file_size INT NOT NULL,
        file_type VARCHAR(100) NOT NULL,
        expiration_date DATE DEFAULT NULL,
        uploaded_by INT DEFAULT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (company_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $conn->query($create_table_sql);

    $sql = "SELECT id, name, description, category, file_name, file_path, file_size, file_type, expiration_date, uploaded_at, updated_at 
        FROM documents 
        WHERE company_id = ? 
        ORDER BY uploaded_at DESC";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al preparar la consulta: ' . $conn->error]);
    exit();
}

$stmt->bind_param('i', $company_id);
$stmt->execute();
$result = $stmt->get_result();

$documents = [];
while ($row = $result->fetch_assoc()) {
    // Verificar si el documento está vencido
    $is_expired = false;
    $days_until_expiration = null;
    
    if ($row['expiration_date']) {
        $exp_date = new DateTime($row['expiration_date']);
        $today = new DateTime();
        $is_expired = $exp_date < $today;
        $days_until_expiration = $today->diff($exp_date)->days;
        if ($exp_date < $today) {
            $days_until_expiration = -$days_until_expiration;
        }
    }
    
    $documents[] = [
        'id' => $row['id'],
        'name' => $row['name'],
        'description' => $row['description'],
        'category' => $row['category'],
        'file_name' => $row['file_name'],
        'file_path' => $row['file_path'],
        'file_size' => $row['file_size'],
        'file_type' => $row['file_type'],
        'expiration_date' => $row['expiration_date'],
        'is_expired' => $is_expired,
        'days_until_expiration' => $days_until_expiration,
        'uploaded_at' => $row['uploaded_at'],
        'updated_at' => $row['updated_at']
    ];
}

$stmt->close();
$conn->close();

echo json_encode([
    'success' => true,
    'documents' => $documents
]);

