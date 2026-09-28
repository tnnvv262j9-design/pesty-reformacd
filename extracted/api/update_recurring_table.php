<?php
include 'db_connect.php';

// Añadir columna months_duration si no existe
$check = $conn->query("SHOW COLUMNS FROM recurring_expenses LIKE 'months_duration'");
if ($check && $check->num_rows == 0) {
    $conn->query("ALTER TABLE recurring_expenses ADD COLUMN months_duration INT DEFAULT 12 AFTER day_of_month");
    echo "Columna 'months_duration' agregada.";
} else {
    echo "Columna 'months_duration' ya existe.";
}

// Añadir columna recurring_id a expenses para poder borrar en cascada (si se desea borrar futuros)
$check2 = $conn->query("SHOW COLUMNS FROM expenses LIKE 'recurring_id'");
if ($check2 && $check2->num_rows == 0) {
    $conn->query("ALTER TABLE expenses ADD COLUMN recurring_id INT DEFAULT NULL AFTER technician_id");
    $conn->query("ALTER TABLE expenses ADD INDEX (recurring_id)");
    echo " Columna 'recurring_id' agregada a expenses.";
} else {
    echo " Columna 'recurring_id' ya existe en expenses.";
}

$conn->close();
?>
