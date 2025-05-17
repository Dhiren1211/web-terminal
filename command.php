<?php
header('Content-Type: text/plain');

session_start();
if (!isset($_SESSION['current_dir'])) {
    $_SESSION['current_dir'] = getcwd();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $type = $_POST['type'] ?? '';
    $command = $_POST['command'] ?? '';

    function sanitizePath($path) {
        $path = str_replace(['../', '..\\'], '', $path);
        return preg_replace('/[^\w\-\.\/]/', '', $path);
    }

    function getNetworkInfo($all = false) {
        $output = '';
        if (function_exists('shell_exec')) {
            if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                $command = $all ? 'ipconfig /all' : 'ipconfig';
                $output = shell_exec($command);
            } else {
                $command = $all ? 'ifconfig -a' : 'ifconfig';
                $output = shell_exec($command);
            }
        } else {
            $output = "Network information not available (shell_exec disabled)";
        }
        return $output;
    }

    switch (strtolower($type)) {
        case 'dir':
            $path = $command ? sanitizePath($command) : '.';
            $fullPath = $_SESSION['current_dir'] . DIRECTORY_SEPARATOR . $path;

            if (is_file($fullPath)) {
                echo "Error: '$path' is a file, not a directory";
                break;
            }

            if (!is_dir($fullPath)) {
                echo "Error: Directory not found: $path";
                break;
            }

            $files = scandir($fullPath);
            if ($files === false) {
                echo "Error: Cannot read directory: $path";
                break;
            }

            $output = "Contents of $path:\n";
            foreach ($files as $file) {
                if ($file !== '.' && $file !== '..') {
                    $output .= is_dir($fullPath . DIRECTORY_SEPARATOR . $file)
                        ? "[DIR]  $file\n"
                        : "       $file\n";
                }
            }
            echo $output;
            break;

        case 'mkdir':
            $dirName = sanitizePath($command);
            if (empty($dirName)) {
                echo "Error: Please specify a directory name";
                break;
            }

            $fullPath = $_SESSION['current_dir'] . DIRECTORY_SEPARATOR . $dirName;
            if (file_exists($fullPath)) {
                echo "Error: File or directory already exists: $dirName";
                break;
            }

            if (mkdir($fullPath, 0755, true)) {
                echo "Success: Directory created: $dirName";
            } else {
                echo "Error: Failed to create directory: $dirName";
            }
            break;

        case 'touch':
            $fileName = sanitizePath($command);
            if (empty($fileName)) {
                echo "Error: Please specify a file name";
                break;
            }

            $fullPath = $_SESSION['current_dir'] . DIRECTORY_SEPARATOR . $fileName;
            if (file_exists($fullPath)) {
                echo "Error: File already exists: $fileName";
                break;
            }

            if (touch($fullPath)) {
                echo "Success: File created: $fileName";
            } else {
                echo "Error: Failed to create file: $fileName";
            }
            break;

        case 'cd':
            $dirName = sanitizePath($command);
            if (empty($dirName)) {
                echo $_SESSION['current_dir'];
                break;
            }

            $fullPath = realpath($_SESSION['current_dir'] . DIRECTORY_SEPARATOR . $dirName);
            if (!$fullPath || !is_dir($fullPath)) {
                echo "Error: Directory not found: $dirName";
                break;
            }

            $_SESSION['current_dir'] = $fullPath;
            echo "Changed directory to: $fullPath";
            break;

        case 'ipconfig':
            $all = strtolower($command) === '/all';
            echo getNetworkInfo($all);
            break;

        case 'cat':
            $filename = trim($command);

            // Sanitize and validate file
            $ext = pathinfo($filename, PATHINFO_EXTENSION);
            $allowed = ['html', 'css', 'js', 'txt', 'json', 'md', 'log'];

            if (!in_array($ext, $allowed)) {
                echo "Error: File type not allowed.";
                break;
            }

            $sanitized = sanitizePath($filename);
            $fullPath = realpath($_SESSION['current_dir'] . DIRECTORY_SEPARATOR . $sanitized);

            // Ensure the file is inside the allowed directory
            if (!$fullPath || strpos($fullPath, realpath($_SESSION['current_dir'])) !== 0) {
                echo "Error: Access denied.";
                break;
            }

            if (!file_exists($fullPath)) {
                echo "Error: File not found: $filename";
                break;
            }

            if (filesize($fullPath) > 1024 * 1024) {
                echo "Error: File too large to display.";
                break;
            }

            echo file_get_contents($fullPath);
            break;

        default:
            echo "Error: Invalid command type";
    }
}
?>
