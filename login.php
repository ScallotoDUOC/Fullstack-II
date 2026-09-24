<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/includes/auth.php';

if (!empty($_SESSION['admin_id'])) {
    header('Location: dashboard.php');
    exit;
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $email = trim(strtolower((string)($_POST['email'] ?? '')));
        $password = (string)($_POST['password'] ?? '');

        if ($email === '' || $password === '') {
            throw new RuntimeException('Completa el correo y la contraseña.');
        }

        $stmt = db()->prepare('SELECT id, nombre, email, password_hash, activo FROM administradores WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $admin = $stmt->fetch();

        if (!$admin || !(bool)$admin['activo'] || !password_verify($password, $admin['password_hash'])) {
            throw new RuntimeException('Correo o contraseña incorrectos.');
        }

        $_SESSION['admin_id'] = (int)$admin['id'];
        $_SESSION['admin_nombre'] = $admin['nombre'];
        $_SESSION['admin_email'] = $admin['email'];
        session_regenerate_id(true);

        header('Location: dashboard.php');
        exit;
    } catch (Throwable $e) {
        $error = $e->getMessage();
    }
}
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Acceso administrador | JuegaYa</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/bootstrap-icons.min.css" rel="stylesheet">
  <link rel="stylesheet" href="assets/admin.css">
</head>
<body class="login-page">
  <div class="login-card">
    <div class="text-center mb-4">
      <div class="login-logo"><i class="bi bi-controller"></i></div>
      <span class="section-kicker">JUEGAYA</span>
      <h1 class="h3 fw-bold mt-2 mb-1">Panel de administración</h1>
      <p class="text-secondary mb-0">Acceso exclusivo para administradores.</p>
    </div>

    <?php if ($error): ?>
      <div class="alert alert-danger small" role="alert"><i class="bi bi-exclamation-circle me-2"></i><?= htmlspecialchars($error) ?></div>
    <?php endif; ?>

    <form method="post" novalidate>
      <div class="mb-3">
        <label for="email" class="form-label">Correo administrador</label>
        <input class="form-control form-control-lg" type="email" id="email" name="email" autocomplete="username" required>
      </div>
      <div class="mb-3">
        <label for="password" class="form-label">Contraseña</label>
        <input class="form-control form-control-lg" type="password" id="password" name="password" autocomplete="current-password" required>
      </div>
      <button class="btn btn-primary btn-lg w-100 rounded-pill" type="submit">Ingresar</button>
    </form>

    <div class="demo-box mt-4">
      <strong>Cuenta de demostración</strong>
      <div class="small text-secondary">Correo: admin@juegaya.cl</div>
      <div class="small text-secondary">Contraseña: admin123</div>
    </div>

    <a class="d-block text-center mt-4 text-decoration-none" href="../index.html"><i class="bi bi-arrow-left me-1"></i>Volver al sitio</a>
  </div>
</body>
</html>
