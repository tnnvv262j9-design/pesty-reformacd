<?php
include 'db_connect.php';

// Obtener los datos enviados en el cuerpo de la solicitud
$data = json_decode(file_get_contents("php://input"));

// --- MEJORA: Validación de datos de entrada ---
// Verificamos que todos los datos necesarios, incluido el ID, estén presentes.
if (!isset($data->id, $data->company_id, $data->name, $data->type, $data->stock)) {
    http_response_code(400); // Bad Request
    echo json_encode(['success' => false, 'message' => 'Datos de producto incompletos para la actualización.']);
    exit();
}

// Asignar variables desde el objeto de datos
$id = intval($data->id);
$company_id = $data->company_id;
$name = $data->name;
$ingredient = $data->ingredient ?? ''; // Usamos el operador de fusión de null para valores opcionales
$type = $data->type;
$stock = $data->stock;
$usage = $data->usage ?? '';

// --- MEJORA: Usar sentencias preparadas para UPDATE para prevenir inyección SQL ---
$stmt = $conn->prepare("UPDATE products SET name = ?, active_ingredient = ?, type = ?, stock = ?, primary_use = ? WHERE id = ? AND company_id = ?");

// Vinculamos los parámetros. El orden y los tipos (s = string, i = integer) deben coincidir.
$stmt->bind_param("sssisii", $name, $ingredient, $type, $stock, $usage, $id, $company_id);

// Ejecutar la consulta
if ($stmt->execute()) {
    // Verificamos si alguna fila fue realmente afectada
    if ($stmt->affected_rows > 0) {
        echo json_encode(['success' => true, 'message' => 'Producto actualizado correctamente.']);
    } else {
        // Esto puede pasar si el producto no existe o si los datos enviados son idénticos a los existentes.
        echo json_encode(['success' => true, 'message' => 'No se realizaron cambios o no se encontró el producto.']);
    }
} else {
    // Si hay un error en la ejecución, enviamos un error de servidor.
    http_response_code(500); // Internal Server Error
    echo json_encode(['success' => false, 'message' => 'Error al actualizar el producto: ' . $stmt->error]);
}

// Cerrar la sentencia y la conexión
$stmt->close();
$conn->close();
?>

