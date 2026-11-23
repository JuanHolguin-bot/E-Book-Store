# E-book Store

Tienda web full-stack para descubrir, comprar y gestionar libros electrónicos. El proyecto combina un catálogo para clientes, checkout con PayPal, entrega digital autenticada y un panel interno para que los empleados gestionen pedidos mediante un tablero Kanban en tiempo real.

## Aplicación desplegada

**URL pública:** [https://e-book-store-production-0fb33ec4.up.railway.app/](https://e-book-store-production-0fb33ec4.up.railway.app/)

El frontend está publicado en Railway. Para habilitar todas las operaciones del backend en el entorno desplegado, configura sus variables de MongoDB Atlas, JWT y PayPal en las variables del servicio. No guardes ni incluyas sus valores en este README, en el código ni en Git.

Consulta el [PRD del proyecto](./docs/PRD.md) para ver objetivos, personas, requisitos funcionales y no funcionales, criterios de aceptación, riesgos y evolución propuesta.

## Funcionalidades

### Cliente

- Explorar, buscar y filtrar el catálogo por categoría.
- Crear una cuenta e iniciar sesión.
- Añadir libros al carrito y ajustar cantidades.
- Pagar con PayPal Sandbox y especificar un correo para la entrega digital.
- Consultar las compras en **Mis libros**.
- Descargar libros PDF o EPUB después de que el archivo autorizado se haya cargado.

### Empleado

- Acceder al panel de gestión con un usuario de rol `staff`.
- Consultar los pedidos pagados en un tablero Kanban.
- Mover pedidos entre **Pendiente**, **Procesando**, **Enviado** y **Entregado**, arrastrando las tarjetas o usando el selector de estado.
- Ver cambios de pedidos en tiempo real mediante Socket.IO.
- Crear y retirar libros del catálogo, y administrar usuarios y roles.

El registro público crea exclusivamente cuentas de cliente. La cuenta de empleado se crea desde el seed con credenciales configuradas en variables de entorno.

## Metodología y arquitectura

El sistema se desarrolló de forma incremental, separando las responsabilidades de interfaz, reglas de negocio, persistencia y comunicación en tiempo real:

1. **Modelo de dominio:** definir usuarios y roles, libros, precios en centavos y pedidos con estados de pago y entrega.
2. **Servicios de backend:** concentrar autenticación, permisos, acceso a MongoDB, gestión del catálogo y operaciones de PayPal en rutas API de Next.js.
3. **Experiencia de usuario:** crear las vistas de catálogo, autenticación, carrito, biblioteca personal y administración responsive.
4. **Tiempo real:** mantener un servidor Node persistente con Socket.IO; los eventos del Kanban se transmiten únicamente a conexiones autenticadas como empleados.
5. **Verificación y despliegue:** ejecutar comprobación de tipos, pruebas de pagos, compilación y smoke tests de HTTP antes de publicar en Railway.

### Flujo de compra

1. El backend vuelve a consultar los libros y calcula el importe con sus precios actuales; no confía en precios enviados por el navegador.
2. Se crea una orden PayPal y un pedido local pendiente.
3. Después de la aprobación del comprador, el backend captura el pago y verifica que esté completado y que importe y moneda coincidan con el pedido.
4. Solo una captura válida convierte el pedido en pagado y lo publica en el tablero del personal.
5. El comprador consulta la biblioteca y descarga el contenido de forma autenticada.

## Stack tecnológico

| Área | Tecnología |
|---|---|
| Aplicación web | Next.js 16, App Router y React 19 |
| Lenguaje y tipos | TypeScript 5 |
| API de backend | Route Handlers de Next.js |
| Base de datos | MongoDB Atlas con Mongoose |
| Autenticación | JWT con `jose`, cookie `HttpOnly` y contraseñas con hash `bcryptjs` |
| Validación de entrada | Zod |
| Pagos | API REST de PayPal; Sandbox por defecto |
| Tiempo real | Servidor Node.js personalizado y Socket.IO |
| Interfaz | CSS responsive y Lucide React |
| Despliegue | Railway y Railpack |

El servidor personalizado aloja tanto Next.js como Socket.IO. Por ello, el despliegue requiere un proceso Node persistente; una plataforma serverless que cierre conexiones persistentes no es adecuada para este servidor de WebSockets.

## Modelo de datos

- **User:** nombre, email único, hash de contraseña, rol (`client`/`staff`) y estado de la cuenta.
- **Book:** título, autor, descripción, categoría, precio en centavos, color de portada, nombre opcional del archivo digital y estado activo.
- **Order:** cliente, copia de los artículos y precios comprados, correo de entrega, identificadores de PayPal, estado de pago, moneda y estado de entrega.

Los artículos de un pedido guardan una copia del precio y la descripción relevante al momento de la compra, para no depender de cambios posteriores al catálogo.

## Rutas principales de la API

| Método y ruta | Uso | Permisos |
|---|---|---|
| `GET /api/books` | Leer catálogo activo | Público |
| `POST /api/books` | Crear libro | Empleado |
| `PATCH /api/books/:id` | Editar libro | Empleado |
| `DELETE /api/books/:id` | Retirar libro del catálogo | Empleado |
| `POST /api/auth/register` | Crear cuenta de cliente | Público |
| `POST /api/auth/login` | Iniciar sesión | Público |
| `POST /api/auth/logout` | Cerrar sesión | Sesión activa |
| `GET /api/auth/me` | Consultar sesión actual | Público |
| `GET /api/users` | Listar usuarios | Empleado |
| `PATCH /api/users` | Actualizar rol o estado de una cuenta | Empleado |
| `POST /api/payments/paypal/create` | Crear orden de pago PayPal | Cliente autenticado |
| `POST /api/payments/paypal/capture` | Capturar y verificar el pago | Cliente propietario |
| `GET /api/orders` | Consultar pedidos pagados | Cliente: propios; empleado: todos |
| `PATCH /api/orders/:id/status` | Actualizar estado de entrega | Empleado |
| `GET /api/orders/:id/books/:bookId/download` | Descargar libro adquirido | Propietario o empleado |
| Socket.IO `/socket.io` | Eventos de nuevos pedidos y cambios de estado | Empleado autenticado |

## Requisitos

- Node.js 20.9 o posterior.
- npm.
- MongoDB Atlas con conectividad desde la máquina local y desde Railway.
- Credenciales de una aplicación de PayPal Developer. Utiliza credenciales Sandbox para pruebas.
- Para el panel en tiempo real, un host Node persistente.

## Seguridad y alcance

- El cliente no puede fijar el precio del carrito, marcar una compra como pagada ni modificar estados de pedidos de empleados.
- El backend valida entradas y vuelve a comprobar usuario activo, rol y propiedad del pedido.
- Las contraseñas se almacenan con hash; las sesiones utilizan una cookie `HttpOnly`.
- Las capturas de PayPal se verifican en el servidor y se comparan con el importe y moneda esperados antes de confirmar la reserva.
- Las cuentas y las credenciales de prueba no deben reutilizarse en producción. Rota cualquier secreto que haya podido quedar expuesto y guárdalo en el gestor de variables del proveedor.

**Alcance actual:** MVP de venta y gestión digital. No incluye envío físico, emails automáticos, almacenamiento persistente de ebooks en Railway ni procesos de reembolso. PayPal Sandbox es para pruebas y no procesa pagos reales.
