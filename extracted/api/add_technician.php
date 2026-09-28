<?php
include 'db_connect.php';
require_once 'check_limits.php'; // <-- Importar validador

// Determinar si es JSON o FormData
$data = json_decode(file_get_contents("php://input"));
if ($data) {
    // Es JSON
    $company_id = $data->company_id ?? null;
    $name = $data->name ?? null;
    $phone = $data->phone ?? null;
    $address = $data->address ?? null;
    $start_date = $data->start_date ?? null;
    $base_salary = isset($data->base_salary) ? floatval($data->base_salary) : 0.00;
} else {
    // Es FormData
    $company_id = $_POST['company_id'] ?? null;
    $name = $_POST['name'] ?? null;
    $phone = $_POST['phone'] ?? null;
    $address = $_POST['address'] ?? null;
    $start_date = $_POST['start_date'] ?? null;
    $base_salary = isset($_POST['base_salary']) ? floatval($_POST['base_salary']) : 0.00;
}

if (!$company_id || !$name || !$phone || !$address) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos incompletos. Se requiere ID de compañía, nombre, teléfono y dirección.']);
    exit();
}

// --- Verificar Límite de Técnicos ---
$limitCheck = checkLimit($conn, $company_id, 'technician');
if (!$limitCheck['allowed']) {
    echo json_encode(['success' => false, 'message' => $limitCheck['message']]);
    exit();
}
// ------------------------------------

// Manejo de la foto
$photo_path = null;
if (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = 'uploads/technicians/';
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $fileTmpPath = $_FILES['photo']['tmp_name'];
    $fileName = $_FILES['photo']['name'];
    $fileSize = $_FILES['photo']['size'];
    $fileType = $_FILES['photo']['type'];
    $fileNameCmps = explode(".", $fileName);
    $fileExtension = strtolower(end($fileNameCmps));
    
    // Validar extensiones
    $allowedfileExtensions = array('jpg', 'gif', 'png', 'jpeg', 'webp');
    if (in_array($fileExtension, $allowedfileExtensions)) {
        $newFileName = md5(time() . $fileName) . '.' . $fileExtension;
        $dest_path = $uploadDir . $newFileName;
        
        if(move_uploaded_file($fileTmpPath, $dest_path)) {
            $photo_path = 'api/' . $dest_path; 
        }
    }
}

// Generar un código de acceso único y verificar que no exista
do {
    $access_code = "TECH-" . rand(1000, 9999);
    $check_stmt = $conn->prepare("SELECT id FROM technicians WHERE access_code = ?");
    $check_stmt->bind_param("s", $access_code);
    $check_stmt->execute();
    $check_stmt->store_result(); 
    $num_rows = $check_stmt->num_rows;
    $check_stmt->close();
} while ($num_rows > 0);


$stmt = $conn->prepare("INSERT INTO technicians (company_id, name, phone, address, access_code, start_date, base_salary, photo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
$stmt->bind_param("isssssds", $company_id, $name, $phone, $address, $access_code, $start_date, $base_salary, $photo_path);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Técnico agregado. Su código de acceso es: ' . $access_code, 'tech_id' => $stmt->insert_id]);
} else {
    http_response_code(500);
    // Verificar si el error es por columna faltante y crearla si es necesario (Autofix simple)
    if (strpos($stmt->error, "Unknown column 'photo'") !== false) {
        $conn->query("ALTER TABLE technicians ADD COLUMN photo VARCHAR(255) DEFAULT NULL AFTER name");
        // Reintentar
        if ($stmt->execute()) {
             echo json_encode(['success' => true, 'message' => 'Técnico agregado (Columna creada).', 'tech_id' => $stmt->insert_id]);
             exit();
        }
    }
    echo json_encode(['success' => false, 'message' => 'Error de base de datos: ' . $stmt->error]);
}
$stmt->close();
$conn->close();
?>
