<?php
include 'db_connect.php';

// Solo el superadmin puede ver esto. Podríamos añadir una validación de sesión aquí.
$sql = "SELECT id, name, admin_code, module_access, plan FROM companies WHERE admin_code != 'GEMAR_ADMIN'";
$result = $conn->query($sql);

// --- MEJORA: Añadir validación del resultado de la consulta ---
if ($result === false) {
    http_response_code(500); // Internal Server Error
    echo json_encode(['success' => false, 'message' => 'Error al consultar la base de datos: ' . $conn->error]);
    $conn->close();
    exit(); // Terminar ejecución
}

$companies = [];
if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        // Decodificamos el JSON para que sea más fácil de usar en el frontend
        // Si module_access es null o inválido, json_decode devuelve null.
        $row['module_access'] = json_decode($row['module_access'], true); // true para array asociativo
        if ($row['module_access'] === null) {
            // Si la decodificación falla o es nulo, lo tratamos como un objeto vacío para evitar errores.
            $row['module_access'] = ['modules' => [], 'actions' => []];
        }
        $companies[] = $row;
    }
}

$conn->close();

echo json_encode(['success' => true, 'companies' => $companies]);
exit(); // --- CORRECCIÓN CLAVE: Asegura que el script termine aquí ---