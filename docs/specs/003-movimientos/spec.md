# Spec 003 — Movimientos

## Contexto y objetivo
Hoy el estudio registra las causas, sus partes y sus abogados (spec 002), pero no lo que va pasando en cada expediente: escritos presentados, providencias, resoluciones, notificaciones, audiencias. Sin ese registro, saber en qué está una causa depende de la memoria de quien la lleva o de revisar el expediente. Esta spec define el registro de los movimientos de cada causa, su historial y la marca que indica si cada movimiento es visible para el cliente. Esa marca, junto con el vínculo cliente-causa de la spec 002 (RF-26 a RF-28), decide qué movimientos verá cada cliente en el portal (spec 004). Como la información está amparada por el secreto profesional, ningún movimiento es visible para el cliente salvo que un integrante lo decida expresamente, el cliente nunca ve la descripción técnica si el abogado escribió un texto pensado para él, y cada cambio de un movimiento queda registrado para poder reconstruir quién mostró qué y cuándo.

## Usuarios / actores
- **Integrante del estudio** (administrador o abogado, según la spec 001): carga, consulta, modifica, anula y restaura movimientos de cualquier causa, y decide cuáles son visibles para el cliente. Todos los integrantes trabajan sobre todas las causas (spec 002, RF-35).
- **Cliente** (spec 001): no gestiona movimientos. Puede ver los movimientos visibles de las causas a las que está vinculado. La forma en que los ve es materia de la spec 004.

## Historias de usuario
- H1: Como integrante del estudio quiero registrar cada movimiento de una causa, con su fecha, tipo y descripción, para tener el historial del expediente en un solo lugar.
- H2: Como integrante del estudio quiero cargar movimientos con fecha anterior para pasar al sistema el historial de causas que ya estaban en trámite.
- H3: Como integrante del estudio quiero cargar movimientos con fecha futura, como una audiencia ya fijada, para tenerlos registrados desde que los conozco.
- H4: Como integrante del estudio quiero que cada movimiento nazca oculto para el cliente y decidir yo cuáles mostrarle, para no revelar por error información reservada.
- H5: Como integrante del estudio quiero escribir, si lo necesito, un texto para el cliente en lenguaje simple, distinto de la descripción técnica, para que entienda lo que pasó sin ver el detalle interno.
- H6: Como integrante del estudio quiero ver qué texto va a leer el cliente cuando marco un movimiento como visible, para no llevarme sorpresas.
- H7: Como integrante del estudio quiero consultar el historial de movimientos de una causa, ordenado, filtrado y con buscador, para encontrar rápido lo que necesito.
- H8: Como integrante del estudio quiero corregir un movimiento mal cargado.
- H9: Como integrante del estudio quiero anular un movimiento cargado por error sin borrarlo y, si era visible para el cliente, que se siga viendo marcado como anulado, para que el cliente entienda que ya no vale en lugar de verlo desaparecer.
- H10: Como integrante del estudio quiero restaurar un movimiento anulado por error.
- H11: Como integrante del estudio quiero consultar el historial de cambios de cada movimiento, para saber quién lo cargó, quién lo hizo visible, qué decía antes y quién lo cambió.

## Requisitos funcionales (criterios de aceptación en EARS)

### Datos del movimiento
- RF-1: EL SISTEMA registra cada movimiento como perteneciente a una sola causa, con:
  - Fecha: obligatoria. Es la fecha del hecho en el expediente, no la de carga. Solo día, mes y año, sin hora.
  - Tipo: obligatorio, de la lista cerrada Escrito presentado, Providencia, Resolución, Sentencia, Notificación, Audiencia, Pericia, Oficio y Otro.
  - Descripción: obligatoria, hasta 2.000 caracteres. Es el texto de uso interno del estudio.
  - Texto para el cliente: opcional, hasta 2.000 caracteres.
  - Si es visible para el cliente.
  - Si está anulado.
- RF-2: EL SISTEMA registra en cada movimiento quién lo cargó y cuándo, y quién lo modificó por última vez y cuándo. Cuentan como modificación cualquier cambio de sus datos, el cambio de visibilidad, la anulación y la restauración.
- RF-3: EL SISTEMA quita los espacios y saltos de línea al inicio y al final de la descripción y del texto para el cliente antes de guardarlos, y conserva los saltos de línea intermedios tal como se cargaron, incluidas las líneas en blanco. Un texto para el cliente que queda vacío se guarda como no informado.
- RF-4: EL SISTEMA solo acepta en la descripción y en el texto para el cliente letras (incluidas las que llevan tilde, la ñ y la ü), números, espacios, saltos de línea y los símbolos `. , ; : / - _ ( ) " ' $ & # ° º ª` (los de la spec 002, RF-4), más `¿ ? ¡ ! %`. Rechaza cualquier otro carácter: emojis, tabulaciones y los signos que permiten inyectar código, como `<`, `>`, `{`, `}`, `[`, `]`, `\`, `|`, `=` y el acento grave. Cada salto de línea cuenta como un carácter.
- RF-5: EL SISTEMA acepta fechas desde el 01/01/1900 hasta el 31/12/2099, incluidas las fechas futuras.
- RF-6: SI algún dato del movimiento no cumple su formato, ENTONCES EL SISTEMA lo rechaza con un mensaje que indique el campo y la regla. En particular:
  - Sin fecha: "Indicá la fecha del movimiento".
  - Fecha inexistente (por ejemplo, 31/02): "La fecha no es válida".
  - Fecha fuera de rango: "La fecha debe estar entre el 01/01/1900 y el 31/12/2099".
  - Descripción vacía: "Indicá la descripción del movimiento".
- RF-7: EL SISTEMA llama **texto visible para el cliente** al texto para el cliente, si está informado, o a la descripción, si no lo está.

### Carga
- RF-8: CUANDO un integrante carga un movimiento en una causa activa con su fecha, tipo y descripción, EL SISTEMA lo guarda como no visible para el cliente, salvo que el integrante lo marque como visible en ese momento, y registra quién lo cargó y cuándo.
- RF-9: CUANDO un integrante marca un movimiento como visible, al cargarlo o al modificarlo, EL SISTEMA le muestra como aviso informativo el texto visible para el cliente (RF-7), indicando si es el texto para el cliente o la descripción. El aviso no exige confirmación.
- RF-10: EL SISTEMA no considera la carga, modificación, anulación ni restauración de un movimiento como modificación de la causa: no cambia quién la modificó por última vez ni su orden en el listado de causas (spec 002, RF-2 y RF-36).

### Modificación y visibilidad
- RF-11: CUANDO un integrante modifica un movimiento no anulado de una causa activa, EL SISTEMA guarda los cambios y registra quién lo modificó y cuándo. Se pueden modificar la fecha, el tipo, la descripción, el texto para el cliente y la visibilidad, con las mismas validaciones que en la carga. La marca de anulado solo cambia con las acciones de RF-16 y RF-18.
- RF-12: EL SISTEMA no permite cambiar la causa a la que pertenece un movimiento. Un movimiento cargado en la causa equivocada se anula y se carga de nuevo en la correcta.
- RF-13: CUANDO se modifica la fecha, el tipo, la descripción o el texto para el cliente de un movimiento que ya era visible y sigue siéndolo, EL SISTEMA muestra el aviso informativo "Este movimiento es visible para el cliente; el cambio se verá en el portal". El aviso no exige confirmación. Si en la misma operación el movimiento pasa de no visible a visible, se aplica RF-9.
- RF-14: EL SISTEMA permite cambiar la visibilidad de un movimiento en los dos sentidos, salvo en los casos de RF-15 y RF-28, que prevalecen. CUANDO un movimiento pasa a no visible, el cliente deja de verlo a partir de su siguiente acción.
- RF-15: SI se intenta modificar o cambiar la visibilidad de un movimiento anulado, ENTONCES EL SISTEMA lo rechaza con el mensaje "El movimiento está anulado. Restauralo para modificarlo".

### Anulación y restauración
- RF-16: CUANDO un integrante anula un movimiento de una causa activa, EL SISTEMA lo marca como anulado, registra quién lo hizo y cuándo (RF-2), y conserva sus datos y su visibilidad tal como estaban. Nunca se borran movimientos.
- RF-17: MIENTRAS un movimiento visible está anulado, EL SISTEMA lo sigue considerando visible para el cliente, con el texto que tenía al anularlo e identificado como "Anulado". Un movimiento no visible que se anula sigue sin ser visible.
- RF-18: CUANDO un integrante restaura un movimiento anulado de una causa activa, EL SISTEMA quita la marca de anulado, conserva la visibilidad que tenía y registra quién lo hizo y cuándo (RF-2).
- RF-19: SI se intenta anular un movimiento ya anulado o restaurar uno que no lo está, ENTONCES EL SISTEMA lo rechaza con el mensaje "El movimiento ya está anulado" o "El movimiento no está anulado", según corresponda.

### Historial de cambios de cada movimiento
- RF-20: EL SISTEMA guarda un registro de cada cambio de un movimiento: la carga, cada modificación (incluidos los cambios de visibilidad), cada anulación y cada restauración. De cada cambio registra la acción, quién la hizo y cuándo y, de cada dato que cambió, su valor anterior y su valor nuevo. En la carga registra los valores iniciales.
- RF-21: EL SISTEMA nunca modifica ni borra el historial de cambios de un movimiento.
- RF-22: CUANDO un integrante consulta un movimiento, EL SISTEMA muestra todos sus datos, el texto visible para el cliente (RF-7), quién lo cargó y quién lo modificó por última vez, y su historial de cambios, primero el más reciente.

### Historial de movimientos de la causa
- RF-23: CUANDO un integrante consulta una causa (spec 002, RF-12), EL SISTEMA muestra además su historial de movimientos, anulados incluidos, de a 20 por página, ordenados así:
  - Por fecha del movimiento, primero el más reciente.
  - A igual fecha, primero el último cargado.
  - A igual fecha e igual momento de carga, primero el último registrado en el sistema.

  El orden es siempre el mismo, de modo que al pasar de página ningún movimiento se repite ni se omite.
- RF-24: EL SISTEMA muestra de cada movimiento del historial:
  - Fecha, tipo y descripción (recortada si es larga, con la opción de verla completa).
  - Si es visible u oculto para el cliente.
  - Si tiene texto para el cliente.
  - Quién lo cargó.
  - La leyenda "Anulado", si lo está.
  - La leyenda "Fecha futura", si su fecha es posterior al día actual en Buenos Aires.
- RF-25: EL SISTEMA permite filtrar el historial por:
  - Tipo.
  - Visibilidad: todos, solo visibles o solo ocultos. "Solo visibles" incluye los anulados visibles, salvo que esté activo "Ocultar anulados".
  - Rango de fechas del movimiento (desde y hasta, ambas inclusive y opcionales).
  - "Ocultar anulados": mientras está activo, no aparece ningún movimiento anulado, cualquiera sea su visibilidad.

  Los filtros se combinan entre sí y con el buscador.
- RF-26: SI la fecha desde es posterior a la fecha hasta, ENTONCES EL SISTEMA lo rechaza con el mensaje "La fecha desde no puede ser posterior a la fecha hasta".
- RF-27: CUANDO un integrante escribe en el buscador del historial, EL SISTEMA muestra los movimientos de esa causa en cuya descripción o texto para el cliente aparece el texto buscado, aunque sea como fragmento. La búsqueda no distingue mayúsculas, minúsculas ni tildes (como en la spec 002, RF-37).

### Causa desactivada, archivada o finalizada
- RF-28: MIENTRAS una causa está desactivada, EL SISTEMA solo permite consultar su historial de movimientos, sus movimientos y el historial de cambios de cada uno. SI se intenta cargar, modificar, cambiar la visibilidad, anular o restaurar un movimiento de una causa desactivada, ENTONCES EL SISTEMA lo rechaza con el mensaje "La causa está desactivada".
- RF-29: MIENTRAS una causa activa tiene el estado Archivada o Finalizada, EL SISTEMA permite gestionar sus movimientos como en cualquier otra causa activa.

### Visibilidad para el cliente
- RF-30: EL SISTEMA considera que un cliente puede ver un movimiento solo si se cumplen las dos condiciones:
  - El movimiento está marcado como visible.
  - El cliente está vinculado a la causa del movimiento según la spec 002 (RF-26 a RF-28).

  Esta es la única regla que decide qué movimientos ve un cliente, y se aplica siempre en el servidor.
- RF-31: EL SISTEMA solo pone a disposición del cliente, de cada movimiento que puede ver, su identificador (para poder consultarlo), su fecha, su tipo, el texto visible para el cliente (RF-7) y, si corresponde, la marca "Anulado". Nunca le expone:
  - La descripción, cuando hay texto para el cliente.
  - Quién cargó, modificó, anuló o restauró el movimiento, ni cuándo (RF-2).
  - El historial de cambios ni las versiones anteriores de sus textos (RF-20).
- RF-32: CUANDO un cliente queda vinculado a una causa, EL SISTEMA le permite ver todos los movimientos visibles de esa causa, anulados incluidos, aunque se hayan cargado o anulado antes del vínculo. CUANDO deja de estar vinculado (spec 002, RF-27), deja de verlos a partir de su siguiente acción.
- RF-33: SI un cliente pide un movimiento que no puede ver, porque está oculto, porque pertenece a una causa a la que no está vinculado o porque no existe, ENTONCES EL SISTEMA responde siempre lo mismo, como si no existiera, sin revelar de cuál de esos casos se trata.

### Integridad y permisos
- RF-34: SI la causa indicada en una operación no existe, ENTONCES EL SISTEMA la rechaza con el mensaje "No existe esa causa". SI el movimiento indicado no existe o no pertenece a la causa indicada, ENTONCES EL SISTEMA la rechaza con el mensaje "No existe ese movimiento", sin distinguir entre los dos casos.
- RF-35: EL SISTEMA solo permite a administradores y abogados cargar, consultar, modificar, anular y restaurar movimientos, y consultar su historial de cambios, solo desde el panel. Cualquier intento de un cliente o de un visitante se rechaza según la spec 001 (RF-18 y RF-19), y este control se hace siempre en el servidor. La consulta de movimientos por parte del cliente se define en la spec 004, aplicando RF-30 a RF-33.
- RF-36: CUANDO se desactiva la cuenta de un integrante (spec 001), EL SISTEMA conserva su autoría en los movimientos y en su historial de cambios, y lo muestra como desactivado.

## Requisitos no funcionales
- Validación: el servidor valida todos los datos recibidos y rechaza los campos desconocidos, sin confiar en las validaciones de la interfaz (como en las specs 001 y 002).
- Textos seguros: la descripción y el texto para el cliente se muestran siempre como texto literal, en el panel y en el portal, y nunca se interpretan como código ni como formato. Esto complementa RF-4 y no lo reemplaza.
- Registros del servidor: la descripción, el texto para el cliente y sus valores en el historial de cambios nunca se escriben en los registros del servidor ni en mensajes de error. Los mensajes de error indican el campo y la regla, sin repetir el texto recibido.
- Aislamiento: la regla de RF-30 se aplica en el servidor en toda consulta de un cliente. Un cliente nunca recibe movimientos no visibles, de causas a las que no está vinculado, la descripción interna cuando hay texto para el cliente ni el historial de cambios (principio 5).
- Privacidad por defecto: ningún movimiento es visible para el cliente sin una acción expresa de un integrante.
- Persistencia: ningún dato de movimientos se guarda en el almacenamiento local del navegador (principio 5).
- Rendimiento: con hasta 5.000 movimientos en una causa, el historial de movimientos, con cualquier combinación de filtros y buscador, responde en menos de 2 segundos.
- Fechas: todas las fechas y horas se registran, comparan y muestran en hora de Buenos Aires (UTC−3), incluido el "día actual" de la leyenda "Fecha futura". La fecha del movimiento es un día del calendario y se muestra siempre igual, sin corrimientos por zona horaria.
- Idioma: todos los mensajes y textos de la interfaz en español.

## Casos límite
- **Fechas:**
  - Movimiento viejo, al pasar una causa al sistema (por ejemplo, de 1998): se acepta (RF-5).
  - Fecha futura (una audiencia fijada): se acepta y el historial la muestra con la leyenda "Fecha futura" hasta que, en Buenos Aires, llega ese día (RF-5, RF-24).
  - 31/12/2099: se acepta. 01/01/2100 o un error de tipeo como 2205 o 1890: se rechazan por fuera de rango (RF-5, RF-6).
  - Error de tipeo dentro del rango (por ejemplo, 2062 en lugar de 2026): se acepta. La leyenda "Fecha futura" ayuda a detectarlo y se corrige modificando el movimiento (RF-11, RF-24).
  - 31/02 o 29/02 de un año no bisiesto: se rechaza como fecha inexistente (RF-6).
- **Orden:**
  - Varios movimientos del mismo día: primero los últimos cargados (RF-23).
  - Misma fecha y mismo momento de carga: decide el orden de registro en el sistema, y el orden no cambia entre páginas (RF-23).
  - Movimiento cargado después con fecha anterior: queda ubicado según su fecha, no según su carga (RF-23).
- **Textos:**
  - Texto para el cliente con solo espacios: se guarda como no informado y el cliente vería la descripción. El aviso de RF-9 lo deja en evidencia al marcarlo como visible (RF-3, RF-7, RF-9).
  - Se borra el texto para el cliente de un movimiento visible: el cliente pasa a ver la descripción. Solo se muestra el aviso informativo de RF-13. Se acepta por ahora.
  - Texto para el cliente igual a la descripción: se acepta.
  - Descripción de exactamente 2.000 caracteres: se acepta; con 2.001, se rechaza. Los saltos de línea cuentan (RF-4).
  - Descripción con emojis, tabulaciones o signos como `<` y `>`: se rechaza (RF-4).
  - Descripción con líneas en blanco entre párrafos: se conservan tal como se cargaron (RF-3).
- **Anulación:**
  - Movimiento visible anulado: el cliente lo sigue viendo, con la leyenda "Anulado" y el texto que tenía al anularlo (RF-17).
  - Movimiento cargado en la causa equivocada: no se lo puede pasar a la correcta; se lo anula y se lo carga de nuevo (RF-12). Si era visible, los clientes de la causa equivocada lo siguen viendo como anulado, salvo que antes de anularlo se lo marque como no visible (RF-14, RF-17).
  - Movimiento visible con información que no debía mostrarse y que además hay que anular: se lo marca como no visible y después se lo anula. Si ya estaba anulado, se lo restaura, se lo marca como no visible y se lo vuelve a anular. Todo queda en su historial de cambios (RF-14, RF-15, RF-18, RF-20).
  - Movimiento anulado y restaurado: recupera su visibilidad anterior y se puede volver a modificar (RF-18).
- **Historial de cambios:**
  - Movimiento modificado muchas veces: queda registrado cada cambio con su valor anterior y nuevo (RF-20).
  - Quién hizo visible un movimiento, aunque después otro integrante lo haya editado: se ve en su historial de cambios (RF-20, RF-22).
  - El cliente nunca ve las versiones anteriores de los textos (RF-31).
- **Clientes:**
  - Cliente vinculado a una causa con movimientos previos: ve todos los visibles, anulados incluidos, aunque se hayan marcado como visibles pensando en otro cliente de la misma causa. El integrante que lo vincula no recibe ningún aviso. Se acepta por ahora (RF-32).
  - Causa sin ningún cliente vinculado (solo partes no cliente, o con el cliente desactivado): la marca de visible no tiene efecto hasta que se vincule alguno, aunque el historial muestre el movimiento como visible. Se acepta (RF-30).
  - Dos clientes vinculados a la misma causa: ven los mismos movimientos visibles. No hay visibilidad por cliente.
  - El tipo y la fecha de un movimiento visible siempre llegan al cliente, aunque el texto para el cliente sea neutro (por ejemplo, el tipo "Pericia"). Se acepta por ahora (RF-31).
  - Cliente que pide un movimiento oculto, de una causa ajena o inexistente: recibe siempre la misma respuesta (RF-33).
  - Cliente desvinculado, causa desactivada o cuenta del cliente desactivada: deja de ver los movimientos a partir de su siguiente acción (RF-30, RF-32; spec 002, RF-27 y RF-28; spec 001).
  - Causa reactivada: los clientes vinculados vuelven a ver sus movimientos visibles (spec 002, RF-42).
  - Incidentes: cada incidente es una causa aparte (spec 002, RF-10). El cliente de la causa principal que no es parte del incidente no ve sus movimientos, y al revés. Se acepta.
- **Estado de la causa:**
  - Causa desactivada: se puede consultar su historial de movimientos y de cambios, pero no gestionar sus movimientos (RF-28).
  - Causa Archivada o Finalizada: se siguen cargando movimientos, por ejemplo el archivo o el desarchivo (RF-29).
  - Carga de movimientos en una causa: no la mueve en el listado de causas ni cambia quién la modificó (RF-10).
- **Integrantes:** un integrante que cargó o modificó movimientos y deja el estudio conserva su autoría, mostrado como desactivado (RF-36).
- **Operaciones inválidas:**
  - Operación sobre un movimiento de otra causa (por ejemplo, manipulando la petición): se rechaza igual que un movimiento inexistente (RF-34).
  - Filtro con fecha desde posterior a fecha hasta: se rechaza (RF-26).
  - "Ocultar anulados" junto con "Solo visibles": no aparece ningún anulado (RF-25).
- **Búsqueda:** sin tildes o en mayúsculas ("NOTIFICACION", "audiencia"), encuentra los movimientos con tildes (RF-27).
- **Concurrencia:**
  - Dos integrantes modifican el mismo movimiento al mismo tiempo: se guarda el último cambio y los dos quedan en el historial de cambios (RF-20).
  - Un integrante guarda una edición abierta antes de que otro cambiara la visibilidad: puede volver a dejar visible un movimiento recién ocultado, o guardar un cambio de texto sin haber visto el aviso de RF-13. Se acepta por ahora; queda registrado en el historial de cambios (RF-20).
  - El aviso de RF-9 muestra un texto que otro integrante cambia antes de guardar. Se acepta por ahora.
  - Un integrante anula un movimiento mientras otro lo modifica: se resuelven de a una. Si la anulación queda primero, la modificación se rechaza (RF-15).
  - Un movimiento se modifica mientras la causa se desactiva: si la desactivación queda primero, la modificación se rechaza (RF-28).

## Fuera de alcance
- La consulta de movimientos por parte del cliente y cómo los ve en el portal (spec 004). Esta spec solo define la regla de visibilidad y los datos que se le pueden mostrar.
- Documentos adjuntos a los movimientos (escritos, resoluciones en PDF).
- Avisos al cliente por email o WhatsApp sobre movimientos nuevos.
- Importación de movimientos desde sistemas judiciales u otras fuentes.
- Vencimientos, plazos, agenda y recordatorios de audiencias.
- Listado general de movimientos de todas las causas (por ejemplo, "últimos movimientos" o "movimientos de mis causas").
- Pasar un movimiento a otra causa.
- Visibilidad distinta para cada cliente de una misma causa.
- Ocultar al cliente el tipo o la fecha de un movimiento visible.
- Avisos al integrante sobre los movimientos que verá un cliente al vincularlo a una causa.
- Detección de ediciones simultáneas sobre un mismo movimiento.
- Catálogo administrable de tipos de movimiento.
- Borrado definitivo de movimientos o de su historial de cambios.

## Criterios de finalización
- Todos los RF con al menos un test en verde.
- Tests que verifiquen:
  - Que un movimiento nuevo es no visible si no se lo marca expresamente (RF-8).
  - La regla de visibilidad para el cliente (RF-30 a RF-32): un cliente puede ver un movimiento solo si es visible y está vinculado a la causa activa, con los casos de cliente desvinculado, causa desactivada, movimiento oculto y movimiento visible anulado. También qué datos y qué texto le corresponden (RF-7, RF-31). La consulta del cliente desde el portal se prueba en la spec 004.
  - Que en una causa desactivada no se pueden cargar, modificar, anular ni restaurar movimientos (RF-28).
  - Que cada carga, modificación, cambio de visibilidad, anulación y restauración queda en el historial de cambios con sus valores anterior y nuevo, y que ese historial no se modifica (RF-20, RF-21).
  - Que se rechazan los caracteres no permitidos (RF-4).
  - Que la descripción y el texto para el cliente no aparecen en los registros del servidor ni en mensajes de error.
  - Que un cliente o un visitante no puede gestionar ni consultar movimientos desde el panel (RF-35).
- `pnpm test` y `pnpm lint` sin errores.
- Demo manual:
  1. Con un abogado, cargar en una causa varios movimientos: uno con fecha de 1998, uno con fecha futura y dos del mismo día. Verificar el orden del historial y la leyenda "Fecha futura".
  2. Verificar que se rechazan una fecha de 1890, una de 2100, una fecha inexistente y una descripción con emojis o con `<`, y que se acepta el 31/12/2099.
  3. Verificar que un movimiento nuevo queda oculto. Marcar uno como visible sin texto para el cliente y otro con texto para el cliente, y comprobar en el aviso de RF-9 qué texto verá el cliente en cada caso.
  4. Modificar un movimiento visible y verificar el aviso "Este movimiento es visible para el cliente; el cambio se verá en el portal".
  5. Anular un movimiento visible y otro oculto. Verificar la leyenda "Anulado", que no se pueden modificar y que la regla de visibilidad sigue considerando visible solo al primero. Restaurar uno.
  6. Consultar el historial de cambios de un movimiento modificado por dos integrantes y verificar que muestra cada acción, quién la hizo, cuándo y los valores anterior y nuevo.
  7. Usar cada filtro del historial y el buscador, con un texto en mayúsculas y sin tildes, incluido "Ocultar anulados" junto con "Solo visibles".
  8. Desactivar la causa, verificar que el historial se consulta pero no se puede cargar ni modificar nada, y reactivarla.
  9. Verificar que la causa no cambió su "modificada por" ni su orden en el listado.

## Dudas abiertas
Ninguna.
