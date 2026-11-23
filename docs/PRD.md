# PRD — E-book Store

| Campo | Detalle |
|---|---|
| Producto | E-book Store |
| Tipo | Tienda web full-stack de libros electrónicos |
| Estado | MVP implementado y publicado; configuración de servicios externos pendiente en el entorno Railway |
| Plataforma | Web responsive |
| URL pública | [https://e-book-store-production-0fb33ec4.up.railway.app/](https://e-book-store-production-0fb33ec4.up.railway.app/) |

## 1. Resumen

E-book Store permite a los clientes explorar y comprar libros electrónicos, y a los empleados administrar el catálogo y procesar pedidos desde un tablero Kanban. La compra se procesa con PayPal; el servidor confirma la captura antes de marcar un pedido como pagado. Los cambios de pedido se transmiten al panel de empleados en tiempo real.

El producto está orientado a contenido digital. La dirección física y el flujo de despacho no forman parte del MVP: el cliente especifica un correo de entrega y accede a los libros disponibles desde su biblioteca autenticada.

## 2. Problema y oportunidad

Los clientes necesitan una manera sencilla de descubrir lecturas, pagar de forma confiable y acceder a sus compras digitales. El equipo de la tienda necesita una fuente centralizada de pedidos y estados operativos sin depender de actualizaciones manuales dispersas.

E-book Store reúne la experiencia de compra y el seguimiento de pedidos en una sola aplicación, con roles separados y confirmación de pago en el backend.

## 3. Visión y objetivos

### Visión

Ofrecer una tienda digital clara y segura que conecte el descubrimiento de libros con una entrega digital verificable y una operación eficiente para el personal.

### Objetivos del MVP

1. Permitir que cualquier visitante consulte y filtre el catálogo.
2. Permitir a los clientes registrarse, autenticarse, comprar con PayPal y consultar sus pedidos y libros.
3. Confirmar los pedidos pagados usando la respuesta verificada del backend de PayPal, no una indicación del navegador.
4. Permitir a los empleados administrar el catálogo, las cuentas y el estado de los pedidos.
5. Propagar al tablero los eventos de pedidos y cambios de estado en tiempo real.
6. Proporcionar una interfaz adaptable a escritorio y móvil.

## 4. No objetivos del MVP

- Venta, empaque o despacho de productos físicos.
- Envío automático de emails transaccionales.
- Procesamiento de reembolsos, disputas o cancelaciones posteriores al pago.
- Almacenamiento persistente y de producción de archivos de libros en Railway.
- Aplicación móvil nativa, recomendaciones personalizadas, reseñas o suscripciones.
- Analítica de producto avanzada o instrumentación de conversión integrada.

## 5. Personas y permisos

### Visitante

- Puede ver, buscar y filtrar libros.
- Puede registrarse como cliente o iniciar sesión.
- No puede acceder a funciones de personal.

### Cliente

- Puede administrar el carrito y completar una compra propia.
- Indica un correo para entrega digital.
- Puede consultar únicamente sus pedidos pagados y descargar archivos de libros que pertenezcan a sus pedidos.
- No puede asignarse un rol de empleado ni cambiar el precio o el estado de pago desde el navegador.

### Empleado

- Accede al panel de operación.
- Puede ver pedidos pagados, actualizar su estado, crear o retirar libros y administrar roles y estado de las cuentas.
- Recibe eventos en tiempo real mientras su sesión de empleado esté autorizada.

El registro abierto siempre crea un usuario cliente. La cuenta inicial de empleado se provisiona mediante el seed y variables de entorno privadas.

## 6. Flujos principales

### 6.1 Descubrimiento y compra

1. El visitante abre el catálogo y busca o filtra libros.
2. El cliente autenticado agrega títulos al carrito y ajusta cantidades.
3. En el checkout confirma el correo de entrega y revisa el total.
4. El backend obtiene los precios actuales desde MongoDB y crea una orden PayPal Sandbox.
5. El cliente aprueba el pago en PayPal.
6. El backend captura y valida estado, importe y moneda.
7. El sistema marca el pedido como pagado, lo pone en **Pendiente** y notifica al tablero de empleados.
8. El cliente consulta **Mis libros** y descarga los archivos disponibles.

Si la captura no es completada o no coincide con el importe y moneda esperados, el pedido no se marca como pagado.

### 6.2 Gestión del pedido

1. Un empleado autenticado abre el tablero Kanban.
2. Localiza el pedido, su correo de entrega y sus artículos.
3. Cambia su estado arrastrando la tarjeta o usando el selector.
4. El backend guarda el cambio y publica un evento de actualización a los empleados conectados.

Estados: **Pendiente → Procesando → Enviado → Entregado**. El flujo representa preparación y disponibilidad digital; no incluye despacho físico.

## 7. Requisitos funcionales

| ID | Requisito | Criterios de aceptación |
|---|---|---|
| RF-01 | Catálogo público | El visitante puede listar libros activos, buscar por texto y filtrar por categoría. |
| RF-02 | Autenticación | Un usuario puede registrarse e iniciar/cerrar sesión. La sesión usa una cookie protegida y el backend consulta el estado y rol de la cuenta. |
| RF-03 | Roles | El registro público crea solo clientes. Las operaciones de gestión requieren rol empleado validado en el servidor. |
| RF-04 | Carrito y checkout | El cliente puede añadir productos, modificar cantidades, ver el resumen e indicar correo de entrega. |
| RF-05 | Creación de pago | El servidor calcula el importe con datos del catálogo, crea una orden PayPal Sandbox y guarda el pedido asociado al comprador. |
| RF-06 | Confirmación de pago | Solo una captura completada con importe y moneda coincidentes habilita el pedido como pagado y su publicación en el tablero. |
| RF-07 | Biblioteca | El cliente autenticado ve sus pedidos pagados y solo puede descargar un libro incluido en su compra. |
| RF-08 | Kanban y tiempo real | El empleado puede mover pedidos entre los cuatro estados; el backend persiste la actualización y comunica el evento al panel. |
| RF-09 | Gestión de catálogo | El empleado puede crear y retirar libros desde el panel sin borrar el historial de pedidos. El endpoint protegido también admite editar los datos de un libro. |
| RF-10 | Gestión de usuarios | El empleado puede consultar usuarios y modificar roles o suspender/reactivar cuentas, salvo desactivar su propia cuenta. |
| RF-11 | Errores explícitos | Los errores de validación, autorización, disponibilidad y servicios externos se devuelven al cliente como respuestas de error y no como éxito simulado. |

## 8. Requisitos no funcionales

### Seguridad

- No confiar en precios, roles, propiedad del pedido ni confirmaciones de pago enviados por el cliente.
- Validar las entradas del backend y aplicar permisos por rol y propiedad.
- Guardar contraseñas mediante hash; no almacenar contraseñas en texto plano.
- Usar cookies de sesión `HttpOnly`, `SameSite=Lax` y `Secure` en producción.
- Mantener MongoDB URI, secreto JWT y credenciales PayPal fuera del repositorio y configurarlos mediante el gestor de variables del entorno.
- Restringir las conexiones Socket.IO al personal autenticado y al origen esperado.
- Servir archivos digitales solo a compradores autorizados y empleados.

### Experiencia y accesibilidad

- La interfaz debe adaptarse a pantallas móviles y de escritorio.
- Las acciones principales deben tener etiquetas accesibles, controles de formularios y estados de carga/error visibles.
- Respetar la preferencia del sistema para reducir movimiento.

### Disponibilidad y operación

- El servicio debe ejecutarse en un proceso Node persistente que admita WebSockets.
- Los fallos de MongoDB y PayPal deben ser visibles y no crear pedidos con forma de pago confirmado.
- Deben existir pruebas, comprobación de tipos y compilación antes de publicar cambios.

## 9. Stack y arquitectura

- **Frontend y rutas API:** Next.js App Router, React y TypeScript.
- **Persistencia:** MongoDB Atlas y Mongoose.
- **Identidad:** JWT firmado con `jose`, contraseñas con `bcryptjs`.
- **Validación:** Zod.
- **Pagos:** API REST de PayPal; Sandbox predeterminado.
- **Tiempo real:** servidor Node personalizado con Socket.IO.
- **Despliegue:** Railway con Railpack.

Entidades principales:

- `User`: perfil, email único, hash de contraseña, rol y estado activo.
- `Book`: metadatos de catálogo, precio en centavos, estado activo y referencia opcional al archivo digital.
- `Order`: propietario, copia de los artículos/precios, correo de entrega, identificadores PayPal, estado de pago y estado de entrega.

## 10. Criterios de éxito y medición

El MVP se considera funcional cuando:

- Un visitante puede recorrer el catálogo desde la URL pública.
- Un cliente puede completar una compra Sandbox y el pedido solo pasa a pagado tras la captura verificada.
- Un cliente no puede consultar pedidos ni descargar libros de otra cuenta.
- Un empleado puede actualizar el estado y los demás empleados conectados reciben la actualización.
- Una solicitud no autenticada o con rol insuficiente no puede ejecutar operaciones protegidas.

Indicadores recomendados para una futura etapa de analítica: conversión de visita a compra, tasa de capturas completadas, errores de checkout, tiempo desde compra hasta disponibilidad y frecuencia de errores de descarga. El MVP no tiene actualmente un servicio de analítica que mida estos indicadores.

## 11. Dependencias y configuración de despliegue

La aplicación está publicada en [Railway](https://e-book-store-production-0fb33ec4.up.railway.app/). Para habilitar las rutas de base de datos, sesiones y pagos, el servicio de Railway necesita al menos:

- `MONGODB_URI`
- `JWT_SECRET`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_ENV=sandbox`
- `APP_URL=https://e-book-store-production-0fb33ec4.up.railway.app`

Los valores secretos deben añadirse directamente en las variables del servicio Railway; no deben pegarse en el repositorio ni en este documento. El dominio y la página pública están operativos, pero la funcionalidad completa del backend depende de esa configuración.

## 12. Supuestos, riesgos y mitigaciones

| Supuesto o riesgo | Mitigación / decisión |
|---|---|
| El catálogo inicial usa libros de muestra. | Los títulos de seed son datos originales de desarrollo; el empleado administra el catálogo real. |
| El pago puede aprobarse en el navegador sin haberse capturado. | El backend realiza la captura y valida importe y moneda antes de confirmar. |
| Una conexión WebSocket puede proceder de una sesión sin permiso. | Socket.IO valida la sesión y exige rol de empleado en el handshake. |
| Railway no garantiza persistencia de archivos en el filesystem local del contenedor. | No usar esa carpeta como almacenamiento de producción; integrar almacenamiento de objetos persistente antes de publicar ebooks reales. |
| El correo de entrega no se envía automáticamente. | El MVP guarda el correo y ofrece la biblioteca autenticada; integrar un proveedor de correo es una mejora futura. |
| La aplicación puede estar publicada con servicios externos sin configurar. | Mantener explícita esta dependencia y comprobar variables y conectividad antes de aceptar pagos. |

## 13. Plan de evolución

### Entregado en el MVP

- Catálogo, búsqueda y filtros.
- Registro e inicio de sesión con roles.
- Carrito y flujo de pago PayPal Sandbox.
- Gestión de catálogo, usuarios y pedidos.
- Kanban con eventos Socket.IO.
- Biblioteca y endpoint de descarga protegida.
- Despliegue de la web en Railway.

### Próximas mejoras recomendadas

1. Configurar y comprobar variables y conectividad en Railway.
2. Integrar almacenamiento persistente de ebooks con controles de acceso.
3. Añadir envío de emails de confirmación y entrega.
4. Incorporar pruebas de integración para autenticación, MongoDB, permisos y flujo PayPal.
5. Añadir observabilidad, métricas de producto y tratamiento de reembolsos.
