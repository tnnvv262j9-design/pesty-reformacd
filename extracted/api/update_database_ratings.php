<?php
// api/update_database_ratings.php
include 'db_connect.php';

echo "Updating database for Service Ratings...<br>";

// Add 'rating' column to services table
try {
    $conn->query("ALTER TABLE services ADD COLUMN rating INT NULL DEFAULT NULL COMMENT '1-5 Stars'");
    echo "Added 'rating' column.<br>";
} catch (Exception $e) {
    echo "Column 'rating' might already exist or error: " . $e->getMessage() . "<br>";
}

// Add 'rating_comment' column to services table
try {
    $conn->query("ALTER TABLE services ADD COLUMN rating_comment TEXT NULL DEFAULT NULL");
    echo "Added 'rating_comment' column.<br>";
} catch (Exception $e) {
    echo "Column 'rating_comment' might already exist or error: " . $e->getMessage() . "<br>";
}

echo "Database update completed.";
$conn->close();
?>