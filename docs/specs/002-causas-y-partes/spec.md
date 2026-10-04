# Spec 002 — Causas y partes

## Contexto y objetivo
Hoy el estudio no tiene en el sistema un registro único de sus causas: qué expedientes lleva, en qué juzgado y fuero tramitan, en qué estado están, quiénes son las partes y qué abogados intervienen. Esta spec define el alta, la edición, el listado, la búsqueda y la desactivación de causas, junto con el registro de sus partes y de los abogados que intervienen. También establece el vínculo entre cada causa y los clientes del estudio que son parte en ella. Ese vínculo es lo que, en specs posteriores, va a decidir qué causas ve cada cliente en el portal. Las specs de movimientos (003), portal (004) y modelos de escritos (006) se construyen sobre esta.

## Usuarios / actores
- **Integrante del estudio** (administrador o abogado, según la spec 001): da de alta, edita, lista, busca, desactiva y reactiva causas. Gestiona sus partes y los abogados que intervienen. Todos los integrantes ven y editan todas las causas.
- **Cliente** (spec 001): no gestiona causas. Queda vinculado a una causa cuando es parte vigente de ella.

## Historias de usuario
- H1: Como integrante del estudio quiero dar de alta una causa con su carátula, número de expediente, juzgado, fuero y estado para tener un registro único de lo que lleva el estudio.
- H2: Como integrante del estudio quiero que el alta no se pierda si una parte o un colaborador es rechazado, para no volver a cargar todo.
- H3: Como integrante del estudio quiero editar los datos de una causa para mantenerla al día, por ejemplo cuando se le asigna número de expediente o cambia de estado.
- H4: Como integrante del estudio quiero marcar una causa como incidente de un expediente principal, para que pueda compartir su número sin que el sistema la tome como duplicada.
- H5: Como integrante del estudio quiero registrar las partes de una causa con su rol procesal, distinguiendo cuáles son clientes del estudio, para saber quién es quién en el expediente.
- H6: Como integrante del estudio quiero que el sistema me avise cuando una persona que cargo ya es cliente del estudio o ya figura en la causa, para no duplicar personas.
- H7: Como integrante del estudio quiero que un cliente quede vinculado a una causa solo cuando es parte en ella, para que el vínculo sea siempre coherente con el expediente.
- H8: Como integrante del estudio quiero desvincular una parte de una causa, consultar después sus datos y volver a vincularla si hace falta.
- H9: Como integrante del estudio quiero indicar qué abogado es el responsable de cada causa y qué colaboradores intervienen, para saber a quién consultar.
- H10: Como integrante del estudio quiero listar, buscar y filtrar causas para encontrar rápido la que necesito.
- H11: Como integrante del estudio quiero ver solo las causas en las que intervengo para organizar mi trabajo.
- H12: Como integrante del estudio quiero detectar las causas cuyo responsable dejó el estudio para reasignarlas.
- H13: Como integrante del estudio quiero eliminar del registro una causa cargada por error sin borrarla de la base.

## Requisitos funcionales (criterios de aceptación en EARS)

### Datos de la causa
- RF-1: EL SISTEMA registra de cada causa:
  - Carátula: obligatoria, hasta 255 caracteres.
  - Número de expediente: opcional, hasta 50 caracteres.
  - Juzgado: texto libre opcional, hasta 150 caracteres.
  - Fuero: obligatorio, de la lista cerrada Civil, Penal, Familia, Laboral, Federal y Otro.
  - Estado: obligatorio, de la lista cerrada En trámite, Paralizada, Archivada y Finalizada.
  - Si es un incidente de un expediente principal y, en ese caso, el número del expediente principal: obligatorio, hasta 50 caracteres. Se muestra como "Vinculado al expte. principal Nº <número>".
  - Si está activa o desactivada.
- RF-2: EL SISTEMA registra en cada causa quién la creó y cuándo, y quién la modificó por última vez y cuándo. Cuentan como modificación de la causa: agregar, modificar, desvincular o volver a vincular una parte, y cambiar los abogados que intervienen. Un cambio en la cuenta de un cliente que es parte no cuenta como modificación de la causa.
- RF-3: EL SISTEMA quita los espacios al inicio y al final de la carátula, el número de expediente, el número del expediente principal y el juzgado antes de guardarlos o compararlos. Un campo opcional que queda vacío se guarda como no informado.
- RF-4: EL SISTEMA solo acepta en la carátula, el número de expediente, el número del expediente principal y el juzgado letras (incluidas las que llevan tilde, la ñ y la ü), números, espacios y los símbolos `. , ; : / - _ ( ) " ' $ & # ° º ª`. No acepta emojis ni saltos de línea.
- RF-5: SI algún dato de la causa no cumple su formato, ENTONCES EL SISTEMA lo rechaza con un mensaje que indique el campo y la regla.

### Alta y edición de causas
- RF-6: CUANDO un integrante da de alta una causa con su carátula, fuero, abogado responsable y al menos una parte, EL SISTEMA la guarda activa, con el estado En trámite si no se indicó otro, y registra quién la creó.
- RF-7: SI al dar de alta una causa alguna parte o colaborador es rechazado, ENTONCES EL SISTEMA igual crea la causa con sus datos y con las partes y colaboradores válidos, e informa cuáles no se guardaron y por qué. Si no queda ninguna parte válida, rechaza el alta indicando el motivo de cada parte.
- RF-8: SI una causa que no es incidente tiene un número de expediente que ya tiene otra causa activa, que tampoco es incidente, del mismo fuero y del mismo juzgado, ENTONCES EL SISTEMA rechaza el alta o la modificación con el mensaje "Ya existe una causa con ese número de expediente en ese juzgado y fuero". Este control solo se aplica si las dos causas tienen juzgado cargado. Para comparar, el número de expediente y el juzgado no distinguen mayúsculas, minúsculas ni tildes.
- RF-9: SI una causa que no es incidente tiene un número de expediente que ya tiene otra causa activa no incidente de otro juzgado o fuero, o si alguna de las dos no tiene juzgado, ENTONCES EL SISTEMA avisa "Ya existe otra causa con ese número de expediente" y permite guardar si el integrante lo confirma.
- RF-10: MIENTRAS una causa está marcada como incidente, EL SISTEMA no le aplica RF-8 ni RF-9. Puede compartir el número con su expediente principal y con otros incidentes. SI se marca una causa como incidente sin indicar el número del expediente principal, ENTONCES EL SISTEMA lo rechaza con el mensaje "Indicá el número del expediente principal". CUANDO se quita la marca de incidente, EL SISTEMA borra ese número.
- RF-11: CUANDO un integrante modifica los datos de una causa activa, EL SISTEMA guarda los cambios y registra quién la modificó. Se pueden modificar todos los datos de RF-1, con las mismas validaciones que en el alta, salvo si está activa o desactivada: eso solo cambia con las acciones de RF-40 y RF-42.
- RF-12: CUANDO se consulta una causa, EL SISTEMA muestra:
  - Sus datos.
  - Sus partes vigentes con su rol procesal, indicando cuáles son clientes del estudio.
  - El abogado responsable y los colaboradores.
  - Quién la creó, quién la modificó por última vez y cuándo.
  - Aparte, sus partes desvinculadas.

### Partes
- RF-13: EL SISTEMA registra cada parte como perteneciente a una sola causa, con su rol procesal, de la lista cerrada Actor, Demandado, Tercero y Otro.
- RF-14: CUANDO se agrega una parte que es cliente del estudio, EL SISTEMA la vincula a la cuenta de ese cliente y toma sus datos de identificación (nombre y apellido o razón social, DNI o CUIT) de esa cuenta, sin duplicarlos. Si los datos del cliente cambian, la parte muestra los datos actualizados.
- RF-15: CUANDO se agrega una parte que no es cliente del estudio, EL SISTEMA registra:
  - Su tipo de persona (física o jurídica).
  - Su nombre y apellido o su razón social, obligatorios y de hasta 55 caracteres cada uno.
  - Opcionalmente, su DNI o CUIT, que se normaliza y valida con las mismas reglas de la spec 001 (RF-5 y RF-6).
- RF-16: SI al agregar o modificar una parte que no es cliente se indica un DNI o CUIT que pertenece a un cliente activo del estudio, ENTONCES EL SISTEMA avisa "Ese DNI o CUIT pertenece a un cliente del estudio" y pregunta si se la agrega como cliente:
  - Si se responde que sí, la vincula como parte cliente (RF-14).
  - Si se responde que no, la guarda como parte no cliente.
  - Si el cliente está desactivado, avisa "Ese DNI o CUIT pertenece a un cliente desactivado" y la guarda como parte no cliente si se confirma.
- RF-17: SI se intenta vincular como parte a un cliente con la cuenta desactivada, ENTONCES EL SISTEMA lo rechaza con el mensaje "El cliente está desactivado".
- RF-18: SI se intenta agregar a una causa una parte que ya es parte vigente de ella (el mismo cliente, o el mismo DNI o CUIT), ENTONCES EL SISTEMA lo rechaza con el mensaje "Esa persona ya es parte de la causa".
- RF-19: SI la parte que se agrega o modifica no coincide por DNI o CUIT con nadie, pero tiene el mismo nombre y apellido o la misma razón social que otra persona, ENTONCES EL SISTEMA pregunta si se trata de la misma persona. La comparación no distingue mayúsculas, minúsculas ni tildes.
  - Si coincide con una parte vigente de la causa, pregunta "Ya hay una parte con ese nombre en la causa. ¿Es la misma persona?". Si se responde que sí, no la agrega; si se responde que no, la agrega.
  - Si es una parte no cliente sin DNI ni CUIT y coincide con uno o más clientes activos del estudio, pregunta "Hay clientes del estudio con ese nombre. ¿Es alguno de ellos?" y muestra sus datos para distinguirlos. Si se elige uno, la vincula como parte cliente (RF-14). Si no se elige ninguno, la guarda como parte no cliente.
- RF-20: CUANDO se vincula un cliente como parte de una causa, SI su DNI o CUIT figura en partes no cliente vigentes de otras causas activas, EL SISTEMA avisa en qué causas figura como no cliente. Esas causas no quedan vinculadas al cliente y el cliente no las ve.
- RF-21: EL SISTEMA permite modificar el rol procesal de cualquier parte, y los datos de una parte que no es cliente, con las validaciones de RF-15. Los datos de una parte que es cliente solo se modifican desde su cuenta (spec 001).
- RF-22: CUANDO un integrante desvincula una parte de una causa, EL SISTEMA la marca como desvinculada, conserva sus datos y deja de mostrarla entre las partes vigentes. Nunca se borran partes.
- RF-23: SI se intenta desvincular la única parte vigente de una causa, ENTONCES EL SISTEMA lo rechaza con el mensaje "La causa debe tener al menos una parte".
- RF-24: CUANDO un integrante vuelve a vincular una parte desvinculada, EL SISTEMA la marca como vigente, con los controles de RF-17 y RF-18.
- RF-25: SI la parte indicada en una operación no pertenece a la causa indicada, ENTONCES EL SISTEMA la rechaza con el mensaje "No existe esa parte".

### Vínculo con clientes
- RF-26: EL SISTEMA considera vinculado a una causa a un cliente solo mientras es parte vigente de ella y la causa está activa, cualquiera sea su estado (incluidas Archivada y Finalizada). No existe otra forma de vincular un cliente a una causa.
- RF-27: CUANDO se desvincula una parte que es cliente, o se desactiva la causa, EL SISTEMA deja de considerar a ese cliente vinculado a la causa. A partir de su siguiente acción ya no puede volver a verla.
- RF-28: CUANDO se desactiva la cuenta de un cliente (spec 001), EL SISTEMA lo conserva como parte de sus causas, para mantener el expediente completo. Si su cuenta se reactiva, recupera el acceso a las causas en las que sigue siendo parte vigente.

### Abogados que intervienen
- RF-29: EL SISTEMA exige que cada causa tenga exactamente un abogado responsable, y permite agregar ninguno, uno o varios colaboradores. Responsable y colaboradores son integrantes del estudio, ya sean abogados o administradores.
- RF-30: SI se intenta asignar como responsable o colaborador a un integrante con la cuenta desactivada que no ocupaba ya ese lugar en la causa, ENTONCES EL SISTEMA lo rechaza con el mensaje "El integrante está desactivado".
- RF-31: SI se intenta asignar dos veces al mismo integrante en una causa, o como responsable y colaborador a la vez, ENTONCES EL SISTEMA lo rechaza con el mensaje "Ese integrante ya interviene en la causa".
- RF-32: CUANDO se desactiva la cuenta de un integrante (spec 001), EL SISTEMA lo conserva como responsable o colaborador de sus causas y lo muestra como desactivado. Al editar los abogados de la causa se lo puede mantener. Mientras esté desactivado no accede al sistema (spec 001).
- RF-33: MIENTRAS el responsable de una causa activa tiene la cuenta desactivada, EL SISTEMA muestra en la causa el aviso "El responsable de esta causa está desactivado. Asigná un nuevo responsable".
- RF-34: CUANDO se reemplaza al responsable o se quita a un colaborador, EL SISTEMA deja de mostrarlo entre quienes intervienen en la causa.
- RF-35: EL SISTEMA no otorga ni quita permisos según quién interviene en una causa: todos los integrantes ven y editan todas las causas (spec 001).

### Listado y búsqueda
- RF-36: CUANDO un integrante consulta el listado de causas, EL SISTEMA muestra las causas activas de a 20 por página. Las ordena por la fecha de su última modificación o, si nunca se modificaron, por la de su alta, primero las más recientes. Muestra de cada una su carátula, número de expediente, juzgado, fuero, estado, si es incidente y su abogado responsable.
- RF-37: CUANDO un integrante escribe en el buscador, EL SISTEMA muestra las causas en las que el texto buscado aparece, aunque sea como fragmento ("ere" encuentra "Pérez"):
  - En su carátula o su número de expediente.
  - En el nombre, el apellido, la razón social, el DNI o el CUIT de alguna parte vigente.

  La búsqueda no distingue mayúsculas, minúsculas ni tildes. En el número de expediente ignora los separadores: "1234/2024" encuentra "1234/2024" y "1234-2024". Los DNI y CUIT se comparan normalizados (RF-5 de la spec 001).
- RF-38: EL SISTEMA permite filtrar el listado por:
  - Fuero.
  - Estado.
  - Abogado responsable, con solo los integrantes activos como opciones.
  - "Solo mis causas": las causas donde el integrante que consulta es responsable o colaborador.
  - "Con responsable desactivado".

  Los filtros se combinan entre sí y con el buscador.
- RF-39: CUANDO un integrante activa el filtro "mostrar desactivadas", EL SISTEMA incluye las causas desactivadas en el listado, identificadas como tales.

### Desactivación y reactivación
- RF-40: CUANDO un integrante desactiva una causa, EL SISTEMA la marca como desactivada, registra quién lo hizo y cuándo, y la quita del listado normal. La desactivación reemplaza al borrado: se usa para quitar del registro una causa que no debería existir (por ejemplo, cargada por error o duplicada). Una causa terminada se marca con el estado Archivada o Finalizada, no se desactiva. Nunca se borran causas.
- RF-41: MIENTRAS una causa está desactivada, EL SISTEMA solo permite consultarla y reactivarla.
- RF-42: CUANDO un integrante reactiva una causa, EL SISTEMA la marca como activa y registra quién lo hizo y cuándo. Los clientes que son partes vigentes vuelven a estar vinculados (RF-26).
- RF-43: SI al reactivar una causa su número de expediente coincide con el de otra causa activa, ENTONCES EL SISTEMA primero pregunta, como en RF-9, si se quiere seguir. Si se confirma y el caso es el de RF-8, rechaza la reactivación con el mensaje de RF-8; si no, la reactiva.

### Permisos
- RF-44: EL SISTEMA solo permite a administradores y abogados gestionar y consultar causas, y solo desde el panel. Cualquier intento de un cliente o de un visitante se rechaza según la spec 001 (RF-18 y RF-19), y este control se hace siempre en el servidor.

## Requisitos no funcionales
- Validación: el servidor valida todos los datos recibidos y rechaza los campos desconocidos, sin confiar en las validaciones de la interfaz (como en la spec 001).
- Aislamiento: el vínculo cliente-causa de RF-26 es la única fuente para decidir qué causas puede ver un cliente. Toda consulta futura de un cliente se filtra en el servidor por ese vínculo (principio 5).
- Persistencia: ningún dato de causas ni de partes se guarda en el almacenamiento local del navegador (principio 5).
- Fechas: todas las fechas y horas se registran y muestran en hora de Buenos Aires (UTC−3).
- Idioma: todos los mensajes y textos de la interfaz en español.

## Casos límite
- **Sin número de expediente.** Causa sin número todavía (mediación o demanda sin presentar): se permite. Varias causas sin número no se consideran duplicadas (RF-1, RF-8).
- **Número repetido en el mismo juzgado y fuero**, con distinto uso de mayúsculas, tildes o espacios: se considera duplicado (RF-3, RF-8).
- **Número repetido en otro juzgado o fuero:** se avisa y se permite guardar si se confirma (RF-9).
- **Número repetido y mismo fuero, pero alguna de las dos causas sin juzgado:** no se puede saber si es el mismo juzgado, así que no se rechaza; se avisa como en RF-9.
- **Mismo número con distintos separadores** ("1234/2024" y "1234-2024"): la búsqueda encuentra los dos (RF-37), pero el control de duplicados no los considera iguales, porque quitar los separadores puede igualar números distintos.
- **Incidente.** Un incidente con el mismo número que su expediente principal no se rechaza ni genera aviso (RF-10). El número del expediente principal es texto: el sistema no verifica que exista una causa con ese número.
- **Número de una causa desactivada:** no se considera duplicado. Al reactivarla se controla de nuevo (RF-8, RF-43).
- **Juzgado escrito de formas distintas** ("Juzgado Civil N° 3" y "Juzg. Civil 3"): el sistema no puede detectar que es el mismo, porque el juzgado es texto libre. Se acepta por ahora.
- **Alta con una parte rechazada.** La causa se crea con el resto, y se informa qué parte no se guardó y por qué (RF-7).
- **Cliente en varias causas:** queda vinculado a cada una por separado.
- **Cliente con dos roles en la misma causa** (por ejemplo, actor y tercero): no se permite. Se registra una sola vez, con un único rol (RF-18).
- **Dos clientes en la misma causa:** por regla ética del estudio, comparten intereses. El sistema no lo controla. Qué datos de las otras partes ve cada cliente lo define la spec 004.
- **Contraparte que después se vuelve cliente.** Las partes no cliente que ya tenía siguen igual y el cliente no ve esas causas. Al vincularlo como cliente en una causa, el sistema avisa en qué otras causas figura como no cliente (RF-20).
- **Parte no cliente cuyo DNI o CUIT es de un cliente:** se pregunta si se la agrega como cliente (RF-16).
- **Parte con el mismo nombre que otra de la causa, sin DNI ni CUIT que las distinga:** se pregunta si es la misma persona (RF-19).
- **Parte no cliente cargada sin DNI ni CUIT, con el nombre de uno o varios clientes del estudio:** se pregunta si es alguno de ellos, mostrando sus datos para distinguir homónimos (RF-19).
- **Parte no cliente con DNI o CUIT que no es de ningún cliente:** no se compara por nombre contra los clientes, porque todo cliente tiene DNI o CUIT y el documento ya indica que es otra persona.
- **Desvincular la única parte:** se rechaza (RF-23).
- **Parte desvinculada por error:** se la vuelve a vincular desde la causa (RF-24).
- **Cliente desactivado que era parte:** sigue figurando en la causa y no puede ingresar. No se lo puede vincular a causas nuevas (RF-17, RF-28). Si se reactiva su cuenta, vuelve a ver las causas en las que sigue siendo parte vigente. Se acepta.
- **Cliente equivocado** (por ejemplo, un homónimo) vinculado por error: tiene acceso a la causa hasta que se lo desvincula. Se acepta por ahora.
- **Responsable que deja el estudio:** sigue figurando como desactivado, la causa muestra el aviso y aparece con el filtro "con responsable desactivado" (RF-32, RF-33, RF-38).
- **Cambio de rol de un integrante** (de abogado a administrador, o al revés): sigue interviniendo en sus causas sin cambios.
- **Búsquedas:**
  - Con un fragmento, en mayúsculas o sin tildes ("PEREZ", "ere"): encuentra las causas de "Pérez" (RF-37).
  - Con DNI o CUIT escrito con puntos o guiones: encuentra la causa igual (RF-37).
- **Causa desactivada:**
  - Intento de editarla: se rechaza hasta reactivarla (RF-41).
  - Archivada o Finalizada: sigue activa, aparece en el listado y el cliente la sigue viendo. Solo la desactivación la quita (RF-26, RF-40).
- **Concurrencia:**
  - Dos integrantes modifican los datos de la misma causa al mismo tiempo: se guarda el último cambio y queda registrado quién lo hizo (como en la spec 001).
  - Dos operaciones simultáneas sobre las partes o los abogados de una misma causa (por ejemplo, desvincular a la vez las dos últimas partes): se resuelven de a una, y la segunda tiene en cuenta el resultado de la primera (RF-18, RF-23, RF-31).
- **Carátula, número o juzgado con emojis o saltos de línea:** se rechazan (RF-4).

## Fuera de alcance
- Movimientos de la causa y su visibilidad para el cliente (spec 003).
- Contenido del portal del cliente (spec 004). Esta spec solo define el vínculo que el portal va a usar.
- Jurisprudencia (spec 005) y modelos de escritos (spec 006).
- Relacionar un incidente con su causa principal dentro del sistema: solo se lo marca como incidente y se anota, como texto, el número del expediente principal.
- Vincular a una causa clientes que no son parte (por ejemplo, el familiar que contrata y paga).
- Controlar conflictos de intereses entre clientes de una misma causa.
- Avisar, al crear la cuenta de un cliente, que ya figura como parte no cliente: se avisa al vincularlo como parte (RF-20).
- Catálogo administrable de juzgados.
- Datos de contacto, domicilio o abogados de la contraparte.
- Permisos por causa: todos los integrantes ven y editan todas.
- Borrado definitivo de causas, partes o clientes.
- Historial completo de cambios sobre las causas: solo se guardan la creación, la última modificación, la desactivación y la reactivación. No se registra quién desvinculó cada parte ni cuándo.
- Importación de causas desde sistemas judiciales u otras fuentes.
- Documentos adjuntos, vencimientos, audiencias y honorarios.

## Criterios de finalización
- Todos los RF con al menos un test en verde.
- Tests que verifiquen:
  - Que un cliente queda vinculado a una causa solo mientras es parte vigente y la causa está activa, cualquiera sea su estado (RF-26, RF-27, RF-42).
  - Que un cliente o un visitante no puede consultar ni gestionar causas (RF-44).
- `pnpm test` y `pnpm lint` sin errores.
- Demo manual:
  1. Con un abogado, dar de alta una causa sin número de expediente, con una parte cliente, una parte no cliente y un colaborador desactivado. Verificar que la causa se crea y que se informa el colaborador rechazado.
  2. Asignarle número de expediente y verificar:
     - El rechazo por duplicado en el mismo juzgado y fuero.
     - El aviso en otro juzgado y con una causa sin juzgado.
     - Que un incidente puede repetir el número y muestra "Vinculado al expte. principal Nº …".
  3. Verificar las preguntas al agregar partes:
     - Una parte no cliente con el DNI de un cliente.
     - Una con un nombre ya cargado en la causa.
     - Una sin DNI con el nombre de un cliente del estudio.
  4. Agregar colaboradores.
  5. Buscar la causa por fragmento de carátula, por número con otro separador y por DNI del cliente, en mayúsculas y sin tildes, y usar cada filtro.
  6. Desvincular la parte cliente, verificar que deja de estar vinculado, consultarla entre las desvinculadas y volver a vincularla.
  7. Desactivar al abogado responsable y verificar el aviso y el filtro.
  8. Desactivar la causa, verificar que sale del listado y que aparece con "mostrar desactivadas", y reactivarla.
  9. Verificar en cada paso el registro de quién creó y modificó la causa.

## Dudas abiertas
Ninguna.
