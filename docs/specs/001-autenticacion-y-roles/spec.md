# Spec 001 — Autenticación y roles

## Contexto y objetivo
El panel de administración y el portal de clientes manejan información amparada por el secreto profesional y la ley de protección de datos personales. Antes de construir cualquier funcionalidad sobre causas, el sistema necesita saber quién es cada usuario, qué rol tiene y a qué puede acceder. Esta spec define el ingreso, la sesión, los roles y la gestión de cuentas, incluidas las de los clientes. Es la base de todas las specs siguientes: ninguna parte del panel ni del portal puede existir sin ella.

## Usuarios / actores
- **Administrador principal**: el primer administrador, creado al instalar el sistema. Tiene todos los permisos de administrador y ningún otro administrador puede quitarle el rol ni desactivarlo.
- **Administrador**: integrante del estudio que gestiona todas las cuentas (integrantes y clientes). Tiene además todos los permisos de abogado.
- **Abogado**: integrante del estudio que usa el panel para su trabajo. Gestiona las cuentas de los clientes, pero no las de los integrantes.
- **Cliente**: persona física o jurídica que consulta sus propias causas en el portal. Nunca accede al panel.
- **Visitante**: persona sin sesión. Solo accede a las páginas públicas y a la pantalla de ingreso.

## Historias de usuario
- H1: Como integrante del estudio quiero ingresar con mi email y contraseña para acceder al panel.
- H2: Como cliente quiero ingresar con mi email y contraseña para ver el estado de mis causas.
- H3: Como administrador quiero crear cuentas de abogados y de clientes para que no exista registro público.
- H4: Como abogado quiero dar de alta a un cliente nuevo sin depender del administrador, para que empiece a usar el portal cuanto antes.
- H5: Como administrador o abogado quiero desactivar la cuenta de un cliente para cortar su acceso cuando ya no corresponde, sin perder su historial.
- H6: Como administrador quiero desactivar la cuenta de un integrante que deja el estudio, sin perder la autoría de lo que cargó.
- H7: Como administrador o abogado quiero restablecer la contraseña de un cliente para ayudarlo si la olvidó.
- H8: Como usuario quiero cambiar mi contraseña para mantener mi cuenta segura.
- H9: Como usuario quiero cerrar sesión para que nadie use mi cuenta en un equipo compartido.
- H10: Como integrante del estudio quiero saber quién creó o modificó por última vez una cuenta para saber a quién consultar.
- H11: Como administrador principal quiero que nadie pueda quitarme el control del sistema, y poder recuperar mi acceso si olvido la contraseña.

## Requisitos funcionales (criterios de aceptación en EARS)

### Cuentas y datos
- RF-1: EL SISTEMA asigna a cada cuenta exactamente un rol: administrador, abogado o cliente. Cada email corresponde a una sola cuenta.
- RF-2: EL SISTEMA registra de cada integrante del estudio: nombre, apellido y email.
- RF-3: EL SISTEMA registra de cada cliente su tipo de persona y email, y además:
  - Persona física: nombre, apellido y DNI.
  - Persona jurídica: razón social, CUIT, y nombre y apellido de la persona de contacto que usa la cuenta.
  - En ambos casos, teléfono y domicilio opcionales.
- RF-4: EL SISTEMA registra en cada cuenta quién la creó y cuándo, quién la modificó por última vez y cuándo, si está activa y la fecha de su último ingreso.
- RF-5: EL SISTEMA normaliza el email (sin espacios al inicio o al final, en minúsculas) y el DNI/CUIT (solo dígitos, sin puntos, guiones ni espacios) antes de buscarlos o guardarlos.
- RF-6: SI algún dato no cumple su formato, ENTONCES EL SISTEMA lo rechaza con un mensaje que indique el campo y la regla:
  - DNI: 7 u 8 dígitos.
  - CUIT: 11 dígitos con dígito verificador válido.
  - Email: formato `texto@texto.texto`.
  - Nombre, apellido, razón social, nombre y apellido de contacto, y domicilio: hasta 55 caracteres. Los obligatorios no pueden quedar vacíos.
  - Teléfono: hasta 15 caracteres.
- RF-7: EL SISTEMA no permite modificar el DNI, el CUIT ni el tipo de persona de un cliente una vez creada la cuenta.

### Ingreso
- RF-8: CUANDO un usuario ingresa un email y una contraseña correctos de una cuenta activa, EL SISTEMA inicia la sesión y registra la fecha de último ingreso. Si la cuenta tiene un cambio de contraseña pendiente, lo lleva a la pantalla de cambio de contraseña; si no, al inicio de su sección: el panel para administradores y abogados, el portal para clientes.
- RF-9: SI el email no existe, la contraseña es incorrecta o la cuenta está desactivada, ENTONCES EL SISTEMA rechaza el ingreso con el mensaje genérico "Email o contraseña incorrectos", sin indicar cuál de los datos falló.
- RF-10: SI se superan 5 intentos de ingreso con un mismo email desde una misma dirección IP, o 30 intentos desde una misma dirección IP, ENTONCES EL SISTEMA rechaza nuevos intentos con el mensaje "Demasiados intentos. Probá de nuevo en unos minutos". La ventana es de 15 minutos desde el primer intento contado; los intentos rechazados durante el bloqueo no la extienden. Se cuentan todos los intentos, exitosos o fallidos.
- RF-11: MIENTRAS una cuenta tiene pendiente el cambio de contraseña, EL SISTEMA solo le permite cambiar su contraseña, consultar sus propios datos y cerrar sesión.

### Sesión
- RF-12: MIENTRAS el usuario sigue usando el sistema, EL SISTEMA mantiene su sesión abierta sin pedirle que vuelva a ingresar. La sesión vence tras 7 días sin uso.
- RF-13: EL SISTEMA permite una sola sesión abierta por usuario. CUANDO un usuario ingresa desde un dispositivo nuevo, EL SISTEMA cierra su sesión anterior.
- RF-14: MIENTRAS la sesión está abierta, EL SISTEMA verifica en cada acción que la cuenta siga activa y aplica el rol vigente. Si el rol cambió, el usuario sigue con su sesión y pasa a ver y hacer solo lo que su nuevo rol permite.
- RF-15: SI se detecta el uso de una credencial de sesión que ya fue reemplazada, ENTONCES EL SISTEMA cierra la sesión de ese usuario, porque indica que la credencial pudo ser robada.
- RF-16: CUANDO un usuario cierra sesión, EL SISTEMA cierra su sesión.
- RF-17: SI la sesión venció o fue cerrada mientras el usuario navegaba, ENTONCES EL SISTEMA lo lleva a la pantalla de ingreso y, tras ingresar, sigue lo indicado en RF-8.

### Autorización
- RF-18: EL SISTEMA niega por defecto el acceso a toda información y acción que no sea pública. Solo son accesibles sin sesión las páginas públicas y la pantalla de ingreso.
- RF-19: SI un usuario intenta una acción que su rol no permite, ENTONCES EL SISTEMA la rechaza con el mensaje "No tenés permiso para realizar esta acción". Este control se hace siempre en el servidor, aunque la interfaz oculte la opción.
- RF-20: SI un cliente intenta entrar al panel, ENTONCES EL SISTEMA lo lleva al portal, y a un integrante que intenta entrar al portal lo lleva al panel.

### Gestión de cuentas
- RF-21: EL SISTEMA permite al administrador crear, listar, consultar, modificar, desactivar, reactivar y restablecer la contraseña de cualquier cuenta, con las limitaciones de RF-31 y RF-32. El abogado puede hacer lo mismo solo con cuentas de clientes.
- RF-22: CUANDO se crea una cuenta con sus datos obligatorios y una contraseña temporal, EL SISTEMA la guarda activa, con cambio de contraseña pendiente, y registra quién la creó. EL SISTEMA no envía la contraseña temporal: quien crea la cuenta se la comunica al usuario personalmente.
- RF-23: SI ya existe una cuenta activa con ese email, ENTONCES EL SISTEMA rechaza el alta o la modificación con el mensaje "Ya existe una cuenta con ese email".
- RF-24: SI el email pertenece a una cuenta desactivada, ENTONCES EL SISTEMA rechaza el alta o la modificación con el mensaje "Ese email pertenece a una cuenta desactivada". Solo un administrador puede liberarlo: al hacerlo, la cuenta desactivada queda sin email y, para reactivarla, hay que asignarle uno nuevo.
- RF-25: SI ya existe un cliente con ese DNI o CUIT, ENTONCES EL SISTEMA rechaza el alta con el mensaje "Ya existe un cliente con ese DNI o CUIT". Si ese cliente está desactivado, el mensaje lo indica, para que se lo reactive en lugar de duplicarlo.
- RF-26: CUANDO un usuario autorizado consulta la lista de cuentas, EL SISTEMA la muestra de a 20 por página, ordenada alfabéticamente por apellido o razón social, con un buscador por apellido, nombre, razón social, DNI o CUIT, y filtros por rol y por estado (activa o desactivada). El abogado solo ve cuentas de clientes.
- RF-27: CUANDO se modifica una cuenta, EL SISTEMA guarda los cambios y registra quién la modificó. Si cambió el email de otra cuenta, cierra la sesión de esa cuenta; si un administrador cambió su propio email, mantiene su sesión actual.
- RF-28: EL SISTEMA solo permite cambiar el rol entre administrador y abogado. Una cuenta de cliente nunca pasa a ser de integrante, ni al revés.
- RF-29: CUANDO se desactiva una cuenta, EL SISTEMA la marca como desactivada y cierra su sesión. Las cuentas nunca se borran, para conservar el historial y la autoría de lo cargado.
- RF-30: CUANDO se reactiva una cuenta, EL SISTEMA exige indicar una contraseña temporal nueva, marca la cuenta como activa y deja pendiente el cambio de contraseña.
- RF-31: SI otro administrador intenta quitarle el rol, desactivar, modificar el email o restablecer la contraseña del administrador principal, ENTONCES EL SISTEMA lo rechaza con el mensaje "No se puede modificar al administrador principal". El administrador principal tampoco puede quitarse el rol ni desactivarse a sí mismo.
- RF-32: CUANDO el administrador principal transfiere esa condición a otro administrador activo, EL SISTEMA designa al nuevo como principal y el anterior pasa a ser un administrador común. Solo el administrador principal puede hacerlo.
- RF-33: CUANDO se restablece la contraseña de una cuenta, EL SISTEMA guarda la contraseña temporal indicada, marca el cambio de contraseña como pendiente y cierra su sesión. Si al mismo tiempo el usuario estaba cambiando su contraseña, prevalece el restablecimiento.
- RF-34: CUANDO se consulta una cuenta, EL SISTEMA muestra sus datos, quién la creó, quién la modificó por última vez, cuándo y su último ingreso.

### Cuenta propia
- RF-35: EL SISTEMA permite a cada usuario consultar sus propios datos. Solo los administradores y abogados los modifican, según RF-21.
- RF-36: CUANDO un usuario envía su contraseña actual y una nueva válida, EL SISTEMA guarda la nueva, quita el cambio de contraseña pendiente y mantiene la sesión actual.
- RF-37: SI la contraseña actual es incorrecta, ENTONCES EL SISTEMA rechaza el cambio con el mensaje "La contraseña actual no es correcta".
- RF-38: SI se ingresa mal la contraseña actual 5 veces en 15 minutos, ENTONCES EL SISTEMA cierra la sesión con el mensaje "Por seguridad, cerramos tu sesión. Volvé a ingresar". El nuevo ingreso queda sujeto a RF-10.
- RF-39: SI una contraseña nueva o temporal no cumple alguna regla, ENTONCES EL SISTEMA la rechaza con el mensaje de la regla incumplida:
  - Menos de 10 caracteres: "La contraseña debe tener al menos 10 caracteres".
  - Más de 64 caracteres: "La contraseña no puede tener más de 64 caracteres".
  - Caracteres fuera de letras sin tilde, números, espacios y símbolos comunes del teclado: "La contraseña no puede tener tildes, ñ ni emojis".
  - Al cambiar la propia, igual a la actual: "La contraseña nueva debe ser distinta de la actual".
- RF-40: EL SISTEMA nunca guarda las contraseñas de forma legible, ni las muestra en respuestas, pantallas o registros.

### Administrador principal desde la consola
- RF-41: CUANDO se ejecuta el comando de consola del servidor y no existe un administrador principal, EL SISTEMA pide los datos de forma interactiva y lo crea. Nunca se crea con credenciales escritas en el código ni en la configuración versionada.
- RF-42: CUANDO se ejecuta el comando de consola del servidor y ya existe un administrador principal, EL SISTEMA solo permite restablecer su contraseña, dejando pendiente el cambio. El comando no crea otros administradores.

## Requisitos no funcionales
- Seguridad: la información de sesión no queda accesible para el código de la página, y ninguna credencial ni dato del usuario se guarda en el almacenamiento local del navegador (principio 5).
- Validación: el servidor valida todos los datos recibidos y rechaza los campos desconocidos, sin confiar en las validaciones de la interfaz.
- Visibilidad: todos los integrantes del estudio ven todas las cuentas de clientes y sus datos. Es una decisión del estudio: todos los abogados trabajan sobre todos los casos.
- Fechas: todas las fechas y horas se registran y muestran en hora de Buenos Aires (UTC−3).
- Idioma: todos los mensajes y textos de la interfaz en español.

## Casos límite
- Email con mayúsculas o espacios, tanto al crear como al ingresar (RF-5).
- DNI o CUIT escrito con puntos, guiones o espacios (RF-5), o CUIT con dígito verificador inválido (RF-6).
- Un abogado que también es cliente del estudio: necesita dos cuentas con emails distintos (RF-1).
- Alta de un cliente con el DNI/CUIT de un cliente desactivado: se ofrece reactivarlo en lugar de duplicarlo (RF-25).
- Alta con el email de una cuenta desactivada: se rechaza hasta que un administrador lo libere (RF-24).
- Varios integrantes ingresando desde la misma IP de la oficina: no se bloquean entre sí mientras cada email no supere su propio límite (RF-10).
- Ingreso desde un segundo dispositivo: la sesión del primero se cierra (RF-13).
- Usuario desactivado con una sesión abierta: su próxima acción es rechazada y vuelve a la pantalla de ingreso (RF-14).
- Cambio de rol con una sesión abierta: la sesión sigue y en la próxima acción rigen los permisos del nuevo rol (RF-14).
- Un abogado intenta modificar, desactivar o restablecer la contraseña de un integrante: se rechaza (RF-19, RF-21).
- Un administrador intenta quitarle el rol o desactivar al administrador principal: se rechaza (RF-31).
- El administrador principal olvida su contraseña: se restablece desde la consola del servidor (RF-42).
- El administrador principal deja el estudio: primero transfiere esa condición (RF-32) y después puede ser desactivado.
- Un abogado desactivado que había creado clientes: esos clientes no se ven afectados; conservan el registro de quién los creó.
- Dos integrantes modifican la misma cuenta al mismo tiempo: se guarda el último cambio y queda registrado quién lo hizo.
- Restablecimiento de contraseña simultáneo con el cambio de contraseña del propio usuario: prevalece el restablecimiento (RF-33).
- Un abogado restablece la contraseña de un cliente y puede ingresar como él: se acepta, porque los abogados ya ven todos los casos.
- Dos pestañas renuevan la sesión al mismo tiempo: puede detectarse como reúso y cerrar la sesión (RF-15). Se acepta por ahora.
- Base vacía en la primera instalación: nadie puede ingresar hasta crear el administrador principal (RF-41).
- Contraseñas con espacios: se aceptan. Con tildes, ñ o emojis: se rechazan (RF-39).
- Sesión vencida con un cambio de contraseña pendiente: vuelve a ingresar y sigue con el cambio (RF-8, RF-17).

## Fuera de alcance
- Recuperación de contraseña por email, envío de invitaciones y de contraseñas temporales.
- Ingreso con DNI o CUIT (el dato se guarda desde ahora para habilitarlo más adelante).
- Cambio del tipo de persona de un cliente.
- Varios accesos para un mismo cliente.
- Una cuenta con más de un rol.
- Varias sesiones simultáneas de un mismo usuario.
- Roles adicionales (empleados, pasantes).
- Segundo factor de autenticación.
- Registro público de usuarios.
- Ingreso con Google u otros proveedores.
- Historial completo de cambios sobre las cuentas (solo se guarda creación, última modificación y último ingreso).
- Edición de sus propios datos por parte del usuario (solo puede cambiar su contraseña).
- Vinculación de clientes y abogados con causas (spec 002).
- Contenido del portal del cliente (spec 004) y del sitio público (spec 007).

## Criterios de finalización
- Todos los RF con al menos un test en verde, incluyendo tests de punta a punta para ingreso, sesión única, cierre de sesión, acceso sin sesión, acceso sin permiso y bloqueo por intentos.
- Tests que verifiquen que un abogado no puede gestionar cuentas de integrantes, que nadie puede quitarle el rol al administrador principal y que un cliente no accede a nada del panel.
- `pnpm test` y `pnpm lint` sin errores.
- Demo manual: crear el administrador principal por consola; crear otro administrador y un abogado; con el abogado, crear un cliente persona física y otro persona jurídica; ingresar con cada uno y verificar el cambio obligatorio de contraseña, la redirección por rol, el bloqueo del panel para el cliente, el registro de quién creó cada cuenta, la sesión única, la desactivación con sesión abierta y la protección del administrador principal.

## Dudas abiertas
Ninguna.
