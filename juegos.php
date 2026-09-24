<?php
$pageTitle = 'Gestión de juegos';
require_once __DIR__ . '/includes/header.php';

$pdo = db();
$mensaje = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        verifyCsrf();
        $accion = (string)($_POST['accion'] ?? '');

        if ($accion === 'guardar') {
            $id = (int)($_POST['id'] ?? 0);
            $nombre = trim((string)($_POST['nombre'] ?? ''));
            $categoria = trim((string)($_POST['categoria'] ?? ''));
            $descripcion = trim((string)($_POST['descripcion'] ?? ''));
            $precioHora = (int)($_POST['precio_hora'] ?? 0);
            $stock = max(0, (int)($_POST['stock'] ?? 0));
            $imagenUrl = trim((string)($_POST['imagen_url'] ?? ''));

            if ($nombre === '' || $categoria === '' || $precioHora <= 0) {
                throw new RuntimeException('Nombre, categoría y precio por hora son obligatorios.');
            }

            if ($id > 0) {
                $stmt = $pdo->prepare('UPDATE juegos SET nombre=?, categoria=?, descripcion=?, precio_hora=?, stock=?, imagen_url=? WHERE id=?');
                $stmt->execute([$nombre, $categoria, $descripcion, $precioHora, $stock, $imagenUrl !== '' ? $imagenUrl : null, $id]);
                $mensaje = 'Juego actualizado correctamente.';
            } else {
                $stmt = $pdo->prepare('INSERT INTO juegos (nombre, categoria, descripcion, precio_hora, stock, imagen_url, activo) VALUES (?, ?, ?, ?, ?, ?, 1)');
                $stmt->execute([$nombre, $categoria, $descripcion, $precioHora, $stock, $imagenUrl !== '' ? $imagenUrl : null]);
                $mensaje = 'Juego creado correctamente.';
            }
        }

        if ($accion === 'toggle') {
            $id = (int)($_POST['id'] ?? 0);
            $stmt = $pdo->prepare('UPDATE juegos SET activo = IF(activo=1,0,1) WHERE id = ?');
            $stmt->execute([$id]);
            $mensaje = 'Estado del juego actualizado.';
        }
    } catch (Throwable $e) {
        $error = $e->getMessage();
    }
}

$editar = null;
if (isset($_GET['editar'])) {
    $stmt = $pdo->prepare('SELECT * FROM juegos WHERE id = ?');
    $stmt->execute([(int)$_GET['editar']]);
    $editar = $stmt->fetch() ?: null;
}

$juegos = $pdo->query('SELECT * FROM juegos ORDER BY id DESC')->fetchAll();
?>

<?php if ($mensaje): ?><div class="alert alert-success"><i class="bi bi-check-circle me-2"></i><?= htmlspecialchars($mensaje) ?></div><?php endif; ?>
<?php if ($error): ?><div class="alert alert-danger"><i class="bi bi-exclamation-circle me-2"></i><?= htmlspecialchars($error) ?></div><?php endif; ?>

<div class="row g-4">
  <div class="col-xl-4">
    <div class="panel-card sticky-xl-top" style="top:1rem;">
      <h2 class="h5 fw-bold mb-3"><?= $editar ? 'Editar juego' : 'Agregar juego' ?></h2>
      <form method="post">
        <input type="hidden" name="csrf" value="<?= htmlspecialchars(csrfToken()) ?>">
        <input type="hidden" name="accion" value="guardar">
        <input type="hidden" name="id" value="<?= (int)($editar['id'] ?? 0) ?>">

        <div class="mb-3"><label class="form-label" for="nombre">Nombre</label><input class="form-control" id="nombre" name="nombre" value="<?= htmlspecialchars($editar['nombre'] ?? '') ?>" required></div>
        <div class="mb-3"><label class="form-label" for="categoria">Categoría</label><input class="form-control" id="categoria" name="categoria" value="<?= htmlspecialchars($editar['categoria'] ?? '') ?>" placeholder="Inflables, arcade, juegos..." required></div>
        <div class="mb-3"><label class="form-label" for="descripcion">Descripción</label><textarea class="form-control" id="descripcion" name="descripcion" rows="4"><?= htmlspecialchars($editar['descripcion'] ?? '') ?></textarea></div>
        <div class="row g-3">
          <div class="col-6"><label class="form-label" for="precio_hora">Precio / hora</label><input class="form-control" type="number" min="1" id="precio_hora" name="precio_hora" value="<?= (int)($editar['precio_hora'] ?? 0) ?>" required></div>
          <div class="col-6"><label class="form-label" for="stock">Stock</label><input class="form-control" type="number" min="0" id="stock" name="stock" value="<?= (int)($editar['stock'] ?? 1) ?>" required></div>
        </div>
        <div class="mb-3 mt-3"><label class="form-label" for="imagen_url">URL de imagen (opcional)</label><input class="form-control" type="url" id="imagen_url" name="imagen_url" value="<?= htmlspecialchars($editar['imagen_url'] ?? '') ?>"></div>
        <button class="btn btn-primary w-100 rounded-pill" type="submit"><?= $editar ? 'Guardar cambios' : 'Crear juego' ?></button>
        <?php if ($editar): ?><a href="juegos.php" class="btn btn-outline-secondary w-100 rounded-pill mt-2">Cancelar edición</a><?php endif; ?>
      </form>
    </div>
  </div>

  <div class="col-xl-8">
    <div class="panel-card">
      <div class="panel-heading"><div><h2 class="h5 fw-bold mb-1">Catálogo</h2><p class="text-secondary small mb-0">HU-062 y HU-063.</p></div><span class="badge bg-dark rounded-pill"><?= count($juegos) ?> juegos</span></div>
      <div class="table-responsive">
        <table class="table admin-table align-middle">
          <thead><tr><th>Juego</th><th>Categoría</th><th>Precio/h</th><th>Stock</th><th>Estado</th><th></th></tr></thead>
          <tbody>
          <?php foreach ($juegos as $j): ?>
            <tr>
              <td><strong><?= htmlspecialchars($j['nombre']) ?></strong><small class="d-block text-secondary text-truncate" style="max-width:280px;"><?= htmlspecialchars($j['descripcion'] ?? '') ?></small></td>
              <td><?= htmlspecialchars($j['categoria']) ?></td>
              <td>$<?= number_format((int)$j['precio_hora'],0,',','.') ?></td>
              <td><?= (int)$j['stock'] ?></td>
              <td><span class="badge-soft <?= $j['activo'] ? 'success' : 'danger' ?>"><?= $j['activo'] ? 'Activo' : 'Inactivo' ?></span></td>
              <td class="text-nowrap">
                <a href="?editar=<?= (int)$j['id'] ?>" class="btn btn-sm btn-outline-dark" title="Editar"><i class="bi bi-pencil"></i></a>
                <form method="post" class="d-inline"><input type="hidden" name="csrf" value="<?= htmlspecialchars(csrfToken()) ?>"><input type="hidden" name="accion" value="toggle"><input type="hidden" name="id" value="<?= (int)$j['id'] ?>"><button class="btn btn-sm btn-outline-secondary" title="Activar/desactivar"><i class="bi bi-power"></i></button></form>
              </td>
            </tr>
          <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>
<?php require_once __DIR__ . '/includes/footer.php'; ?>
