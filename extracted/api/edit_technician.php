<?php
include 'db_connect.php';

// Determinar si es JSON o FormData
$data = json_decode(file_get_contents("php://input"));
if ($data) {
    // Es JSON
    $id = $data->id ?? null;
    $name = $data->name ?? null;
    $phone = $data->phone ?? null;
    $address = $data->address ?? null;
    $start_date = $data->start_date ?? null;
    $base_salary = isset($data->base_salary) ? floatval($data->base_salary) : 0.00;
} else {
    // Es FormData
    $id = $_POST['id'] ?? null;
    $name = $_POST['name'] ?? null;
    $phone = $_POST['phone'] ?? null;
    $address = $_POST['address'] ?? null;
    $start_date = $_POST['start_date'] ?? null;
    $base_salary = isset($_POST['base_salary']) ? floatval($_POST['base_salary']) : 0.00;
}

if (!$id || !$name || !$phone || !$address) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos incompletos.']);
    exit();
}

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

// Construir consulta
if ($photo_path) {
    $stmt = $conn->prepare("UPDATE technicians SET name = ?, phone = ?, address = ?, start_date = ?, base_salary = ?, photo = ? WHERE id = ?");
    $stmt->bind_param("ssssdsi", $name, $phone, $address, $start_date, $base_salary, $photo_path, $id);
} else {
    $stmt = $conn->prepare("UPDATE technicians SET name = ?, phone = ?, address = ?, start_date = ?, base_salary = ? WHERE id = ?");
    $stmt->bind_param("ssssdi", $name, $phone, $address, $start_date, $base_salary, $id);
}

if ($stmt->execute()) {
    if ($stmt->affected_rows > 0) {
        echo json_encode(['success' => true, 'message' => 'Técnico actualizado.']);
    } else {
        // Puede ser que no hubo cambios
        echo json_encode(['success' => true, 'message' => 'Técnico actualizado (sin cambios detectados).']);
    }
} else {
    http_response_code(500);
    // Auto-fix column missing if needed
    if (strpos($stmt->error, "Unknown column 'photo'") !== false) {
        $conn->query("ALTER TABLE technicians ADD COLUMN photo VARCHAR(255) DEFAULT NULL AFTER name");
        // Reintentar
        if ($stmt->execute()) {
             echo json_encode(['success' => true, 'message' => 'Técnico actualizado (Columna creada).']);
             exit();
        }
    }
    echo json_encode(['success' => false, 'message' => 'Error al actualizar: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
