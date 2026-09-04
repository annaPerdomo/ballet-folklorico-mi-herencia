/* Team availability app: owners (password) and families (invite link). */
(function () {
  'use strict';

  var app = document.getElementById('app');
  var painted = null;
  var tabsEl = document.getElementById('tabs');
  var headerRight = document.getElementById('header-right');
  var fabRoot = document.getElementById('fab-root');
  var state = { me: null, events: [], families: [], roster: 0, botLog: null, tab: 'inbox', focusEvent: null, detail: null, gigLink: null, lang: 'en', loadedAt: 0 };

  /* ── i18n ───────────────────────────────────────────────── */
  var STR = {
    en: {
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      status: { inquiry: 'New inquiry', open: 'Open', confirmed: 'Confirmed', done: 'Done', declined: 'Declined', cancelled: 'Cancelled' },
      types: { festival: 'Cultural Festival', quinceanera: 'Quinceañera', wedding: 'Wedding', private: 'Private Event', corporate: 'Corporate Event', school: 'School Assembly', classes: 'Classes', other: 'Other' },
      dateTbd: 'Date TBD', date: 'Date', tbd: 'TBD', performance: 'Performance', untitled: 'Untitled',
      callTime: 'Call time', dancersNeeded: '{n} dancers needed', pay: 'Pay', rehearsals: 'Rehearsals', whosIn: "Who's in",
      yes: 'yes', maybe: 'maybe', no: 'no', noAnswer: 'no answer',
      btnYes: '✓ Yes', btnMaybe: '? Maybe', btnNo: '✗ No', availabilityFor: 'Availability for {name}',
      signOut: 'Sign out', familia: 'Familia', owner: 'Owner', newGig: '+ New gig',
      loginTitle: 'Owner sign-in', loginText: 'Enter your password to manage events.',
      ownerPassword: 'Owner password', signIn: 'Sign in', notConfigured: 'ADMIN_PASSWORD is not set on the server yet.',
      signInAs: 'Your name',
      badLink: 'That link is not valid anymore. Ask the owners for a new one.',
      needsAnswer: 'Needs your answer', upcoming: 'Upcoming', recent: 'Recent', myFamily: 'My family',
      subscribe: 'Add our gigs to your calendar', subscribeHint: 'Keeps updating on its own as dates change.',
      subscribeOwner: 'Add every gig to your calendar', addToCal: 'Add to my calendar', calSection: 'Calendar',
      subscribeWhat: 'Every gig posted to the team lands in your calendar until you turn it down — the ones your family answers no to drop off on their own. It keeps updating as dates and details change.',
      subscribeWhatOwner: 'Every gig on the board — open, confirmed and finished — with the pay line, which only owners can see. It keeps updating on its own as dates and details change.',
      addToCalHint: 'Saves the call time, the address, and a reminder the day before.',
      subscribePick: 'Which calendar do you use?', calApple: 'Apple Calendar / iPhone', calGoogle: 'Google Calendar',
      calOutlook: 'Outlook', calCopy: 'Copy the link instead',
      calGoogleNote: 'Google checks for changes once a day or so, Apple and Outlook every few hours. If a date just moved, open the gig and add it again to get it right away.',
      addDancersFirst: 'Add the dancers in your family below so you can mark availability for each of them.',
      allAnswered: 'Everything else is answered. ¡Gracias!', noGigs: 'No gigs posted yet. The owners will post here when an inquiry comes in.',
      answerCleared: 'Answer cleared', dancers: 'Dancers', addDancerPh: 'Add a dancer (e.g. Sofia)', dancerName: 'Dancer name', add: 'Add',
      removeDancer: 'Remove {name} from your family?', remove: 'Remove', phone: 'Phone',
      saved: 'Saved', copied: 'Copied', copyFail: 'Could not copy',
      tabInbox: 'Inbox', tabGigs: 'Gigs', tabTeam: 'Team', tabChona: 'La Chona',
      groupmeOn: 'La Chona is connected', groupmeOff: 'La Chona is not connected — set GROUPME_BOT_ID',
      newInquiries: 'New inquiries', inboxSub: 'Every message from the website contact and quote forms lands here automatically.', inboxClear: 'Inbox is clear.',
      archived: 'Declined / cancelled', posted: 'Posted to the team',
      nothingPosted: 'Nothing posted yet. Post an inquiry from the Inbox, or create a new gig.', past: 'Past',
      from: 'From', email: 'Email', type: 'Type', received: 'Received', via: 'via',
      askGroup: '🙋 Ask GroupMe who’s available', askAgain: 'Ask again in GroupMe', postTally: 'Post tally to GroupMe',
      askedLine: 'Bot asked {when} · {n} of {total} answered', askedNever: 'Not asked in GroupMe yet', askedToast: 'Asked in GroupMe — replies will fill in the roster', askNeedsDate: 'Set the event date first — replies are matched by date',
      justNow: 'just now', minsAgo: '{n} min ago', hoursAgo: '{n} h ago', daysAgo: '{n} d ago',
      postToTeam: 'Post to team', edit: 'Edit', decline: 'Decline', reopen: 'Reopen as inquiry', del: 'Delete',
      deleteConfirm: 'Delete “{title}” permanently?', thisEvent: 'this event', done: 'Done', donePosted: 'Done — posted to {ch}', groupme: 'GroupMe',
      requiredTag: 'required', optionalHead: 'Optional — fill in what you know',
      payLabel: 'Pay (owners only)', payPh: '$50 per dancer',
      title: 'Title', titlePh: 'e.g. Quinceañera — Lopez family', typeLabel: 'Type', typePh: '— type —', dateLabel: 'Date', startTime: 'Start time', endTime: 'End time',
      dancersNeededLabel: 'Dancers needed', venue: 'Venue', city: 'City', address: 'Address',
      clientWrote: 'Client wrote (date & city)', detailsForTeam: 'Details for the team', detailsPh: 'Costume, dances, parking, what to bring…',
      rehearsalsLabel: 'Rehearsals (shown to the team)', rehearsalDate: 'Rehearsal date', time: 'Time', locationNote: 'Location / note', addRehearsal: '+ Add rehearsal',
      clientSection: 'Client contact & private notes', clientName: 'Client name', clientEmail: 'Client email', clientPhone: 'Client phone', clientMessage: 'Client message',
      privateNotes: 'Private notes (owners only)',
      needTitle: 'Give the gig a title.', create: 'Create', save: 'Save', cancel: 'Cancel', close: 'Close',
      modalNew: 'New gig', modalEdit: 'Edit gig',
      tapToChange: 'Tap to change',
      editDetails: 'Edit details', postAnnouncement: 'Post the announcement', sendReminder: 'Send reminder', confirmGig: 'Confirm gig',
      confirmAsk: 'Confirm this gig? Families who said yes will be notified (if a channel is connected).', cancelGig: 'Cancel gig', cancelAsk: 'Cancel this gig?',
      postConfirmation: 'Post the confirmation', markDone: 'Mark done', gig: 'Gig',
      botEmpty: 'No messages read yet.', botIgnored: 'Ignored', botNoDancers: 'Could not tell which dancer', botUnknownSender: 'Unknown sender — no dancer named', botNoEvent: 'No open gig to apply it to', botGuessed: '(assumed latest gig)', botLinked: 'GroupMe linked', botAmbiguous: 'Ambiguous name: {names}', botNoDate: 'No gig on that date', botVague: 'Long message with no date — not applied',
      addFamilyFrom: 'Add this family', reread: 'Read again', addFamilyHint: 'From GroupMe name “{name}”. Check the spelling of each dancer — the bot matches these names in the chat.',
      pickWho: 'Who’s answering?', pickHint: 'Tap your family. We’ll remember you on this phone.', pickNotListed: 'Don’t see your family? Just reply in GroupMe and the owners will add you.',
      pickClosed: 'This gig isn’t taking answers right now.', pickBadLink: 'That link is no longer valid. Ask the owners for a new one.',
      chonaAlt: 'La Chona, a little gold robot in a red and green folklorico dress with braided ribbons',
      chonaOn: 'Listening to the chat', chonaOff: 'Not listening yet',
      chonaLive: 'Connected · listening to the chat', chonaPostOnly: 'Connected · not listening yet',
      chonaListenOnly: 'Listening · can’t post yet', chonaDown: 'Not connected',
      botSubOff: 'Not listening yet. Set GROUPME_WEBHOOK_SECRET on the server and point the bot’s callback URL at /api/webhooks/groupme?secret=… (see README).',
      postFailed: 'GroupMe did not take the message — try again',
      guideWho: 'La Chona sits in the GroupMe chat, reads what the families write, and marks the roster for you — so nobody counts yeses by hand at midnight.',
      guideSteps: 'What she does',
      guideStep1: 'You tap **Ask GroupMe** on a gig. She posts the date, the place, and an example reply — you never copy or paste anything.',
      guideStep2: 'Families answer however they like — in the chat, or by tapping her link.',
      guideStep3: 'She marks the roster and replies **🤖 Noted:** so everyone can see she caught it.',
      guideStep4: 'Anything she couldn’t read lands below, with a button to set her straight.',
      guidePosts: 'What she posts',
      guidePostsSub: 'Word for word, this is what the group sees. Every one of these is one button on a gig — the caption is the button you tap.',
      guideReads: 'She understands', guideReadsSub: 'However people say it, in English or Spanish.',
      guideMisses: 'She won’t', guideNeedDate: 'Give the ask a date — she matches replies by date.',
      guideM1: 'Guess at a dancer she doesn’t know — add the family from the log below.',
      guideM2: 'Choose between gigs when a bare “yes” has no date; she takes the most recent ask.',
      guideM3: 'Let an old message overwrite a newer answer.',
      guideM4: 'Post anything on her own — she only speaks when you tap a button here.',
      guideFix: 'She got it wrong? Tap the chips in the gig roster. You always have the last word.',
      showOnWebsite: 'Show on website', hideFromWebsite: 'Hide from website', websiteOn: 'Now listed on bfmh.dance', websiteOff: 'Removed from bfmh.dance',
      familiesTitle: 'Families & dancers', familiesSub: 'Each family gets one private link that signs them in — no password, no account to make. “Send link” shares it by GroupMe DM or text; they tap it and can mark who is available for every dancer in their household, on every gig you post. The link keeps working, so you only send it once. If it ever reaches someone outside the family, “New link” replaces it and the old one stops working.',
      familyNamePh: 'Family name (e.g. Garcia)', dancersPh: 'Dancers, comma separated (e.g. Luis, Elena)',
      newFamily: 'New family', addFamily: 'Add family', familyAdded: 'Family added', noFamilies: 'No families yet.',
      removeAsk: 'Remove {name}?', addDancer: 'Add dancer', copyInvite: 'Copy invite link', newLink: 'New link',
      newLinkAsk: 'Create a new link for {name}? The old one will stop working.', removeFamily: 'Remove family', removeFamilyAsk: 'Remove the {name} family and their dancers?',
      roleTeam: 'Team', stateNone: 'Not answered', stateYes: 'Going', stateMaybe: 'Maybe', stateNo: 'Not going',
      waiting: 'no response received', plusWaiting: '+{n} with no response', everyoneAnswered: 'everyone answered', rosterSettled: 'Roster settled',
      neverAsked: 'Never asked', askedAgo: 'Asked {when}', rehearsalsShort: 'Rehearsals',
      inboxEmptyText: 'Nothing new from the website. Inquiries from the contact and quote forms show up here on their own.',
      inboxEmptyBtn: 'Create a gig by hand', noGigsFamilyText: 'No gigs posted yet. When the owners post one you’ll hear about it in GroupMe.',
      checkMyDancers: 'Check my dancers', allAnsweredText: 'Everything is answered. ¡Gracias! We’ll let you know when the next one is posted.',
      families: 'Families', addAFamily: 'Add a family', botHeard: 'What La Chona heard', botLinkedChip: 'Bot linked', notLinked: 'Not linked',
      openGig: 'Open gig', addRehearsalShort: 'Add rehearsal',
      going: 'going', ofNeeded: 'of {n} needed', moreNeeded: '{n} more needed', full: 'Roster is full', noneYet: 'No answers yet',
      remindWaiting: 'Remind {n} with no answer', moreActions: 'More', setAnswerFor: 'Answer for {name}', clearAnswer: 'Clear answer',
      waitingOn: 'No response received', tapGigHint: 'Tap a gig to see who’s in and nudge who isn’t.',
      goingAre: 'Going:',
      everyone: 'Everyone in the family', allYes: 'All yes', allNo: 'All no',
      shareInvite: 'Send link', inviteMsg: 'Your family’s link for Ballet Folklórico Mi Herencia gigs — tap it to mark who can dance:',
      refresh: 'Refresh', tryAgain: 'Try again', refreshed: 'Up to date', answered: 'answered', answeredLine: '{n} of {total} answered', tapName: 'Tap a name to answer for them.',
      when: 'When', where: 'Where', needs: 'Needs', client: 'Client', call: 'Call', text: 'Text',
      chatOn: 'La Chona is in the chat', chatOff: 'La Chona is not connected',
    },
    es: {
      months: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
      days: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
      status: { inquiry: 'Nueva solicitud', open: 'Abierto', confirmed: 'Confirmado', done: 'Terminado', declined: 'Rechazado', cancelled: 'Cancelado' },
      types: { festival: 'Festival cultural', quinceanera: 'Quinceañera', wedding: 'Boda', private: 'Evento privado', corporate: 'Evento corporativo', school: 'Asamblea escolar', classes: 'Clases', other: 'Otro' },
      dateTbd: 'Fecha por confirmar', date: 'Fecha', tbd: '¿?', performance: 'Presentación', untitled: 'Sin título',
      callTime: 'Hora de llegada', dancersNeeded: 'Se necesitan {n} bailarines', pay: 'Pago', rehearsals: 'Ensayos', whosIn: 'Quién va',
      yes: 'sí', maybe: 'tal vez', no: 'no', noAnswer: 'sin respuesta',
      btnYes: '✓ Sí', btnMaybe: '? Tal vez', btnNo: '✗ No', availabilityFor: 'Disponibilidad de {name}',
      signOut: 'Salir', familia: 'Familia', owner: 'Dueño', newGig: '+ Nuevo evento',
      loginTitle: 'Acceso de dueños', loginText: 'Escribe tu contraseña para administrar eventos.',
      ownerPassword: 'Contraseña de dueño', signIn: 'Entrar', notConfigured: 'ADMIN_PASSWORD todavía no está configurado en el servidor.',
      signInAs: 'Tu nombre',
      badLink: 'Ese enlace ya no es válido. Pide uno nuevo a los dueños.',
      needsAnswer: 'Falta tu respuesta', upcoming: 'Próximos', recent: 'Recientes', myFamily: 'Mi familia',
      subscribe: 'Agrega nuestros eventos a tu calendario', subscribeHint: 'Se actualiza solo cuando cambian las fechas.',
      subscribeOwner: 'Agrega todos los eventos a tu calendario', addToCal: 'Agregar a mi calendario', calSection: 'Calendario',
      subscribeWhat: 'Cada evento publicado al equipo aparece en tu calendario hasta que lo rechazas — los que tu familia contesta que no desaparecen solos. Se actualiza cuando cambian las fechas y los detalles.',
      subscribeWhatOwner: 'Todos los eventos del tablero — abiertos, confirmados y terminados — con el pago, que solo ven los dueños. Se actualiza solo cuando cambian las fechas y los detalles.',
      addToCalHint: 'Guarda la hora de llegada, la dirección y un recordatorio el día anterior.',
      subscribePick: '¿Qué calendario usas?', calApple: 'Apple Calendar / iPhone', calGoogle: 'Google Calendar',
      calOutlook: 'Outlook', calCopy: 'Mejor copiar el enlace',
      calGoogleNote: 'Google busca cambios una vez al día; Apple y Outlook cada pocas horas. Si una fecha acaba de cambiar, abre el evento y agrégalo de nuevo para tenerlo al instante.',
      addDancersFirst: 'Agrega abajo a los bailarines de tu familia para marcar la disponibilidad de cada uno.',
      allAnswered: 'Todo lo demás ya está respondido. ¡Gracias!', noGigs: 'Aún no hay eventos publicados. Los dueños publicarán aquí cuando llegue una solicitud.',
      answerCleared: 'Respuesta borrada', dancers: 'Bailarines', addDancerPh: 'Agregar bailarín (p. ej. Sofía)', dancerName: 'Nombre del bailarín', add: 'Agregar',
      removeDancer: '¿Quitar a {name} de tu familia?', remove: 'Quitar', phone: 'Teléfono',
      saved: 'Guardado', copied: 'Copiado', copyFail: 'No se pudo copiar',
      tabInbox: 'Solicitudes', tabGigs: 'Eventos', tabTeam: 'Equipo', tabChona: 'La Chona',
      groupmeOn: 'La Chona está conectada', groupmeOff: 'La Chona no está conectada — falta GROUPME_BOT_ID',
      newInquiries: 'Nuevas solicitudes', inboxSub: 'Cada mensaje del formulario de contacto y de cotización del sitio llega aquí automáticamente.', inboxClear: 'No hay solicitudes pendientes.',
      archived: 'Rechazados / cancelados', posted: 'Publicados al equipo',
      nothingPosted: 'Nada publicado todavía. Publica una solicitud desde Solicitudes o crea un evento nuevo.', past: 'Pasados',
      from: 'De', email: 'Correo', type: 'Tipo', received: 'Recibido', via: 'vía',
      askGroup: '🙋 Preguntar en GroupMe quién puede', askAgain: 'Volver a preguntar en GroupMe', postTally: 'Publicar el conteo en GroupMe',
      askedLine: 'El bot preguntó {when} · {n} de {total} respondieron', askedNever: 'Aún no se ha preguntado en GroupMe', askedToast: 'Preguntado en GroupMe — las respuestas llenarán la lista', askNeedsDate: 'Primero pon la fecha del evento — las respuestas se identifican por fecha',
      justNow: 'ahora mismo', minsAgo: 'hace {n} min', hoursAgo: 'hace {n} h', daysAgo: 'hace {n} d',
      postToTeam: 'Publicar al equipo', edit: 'Editar', decline: 'Rechazar', reopen: 'Reabrir como solicitud', del: 'Eliminar',
      deleteConfirm: '¿Eliminar “{title}” permanentemente?', thisEvent: 'este evento', done: 'Listo', donePosted: 'Listo — publicado en {ch}', groupme: 'GroupMe',
      requiredTag: 'obligatorio', optionalHead: 'Opcional — llena lo que sepas',
      payLabel: 'Pago (solo dueños)', payPh: '$50 por bailarín',
      title: 'Título', titlePh: 'p. ej. Quinceañera — familia López', typeLabel: 'Tipo', typePh: '— tipo —', dateLabel: 'Fecha', startTime: 'Hora de inicio', endTime: 'Hora de fin',
      dancersNeededLabel: 'Bailarines necesarios', venue: 'Lugar', city: 'Ciudad', address: 'Dirección',
      clientWrote: 'El cliente escribió (fecha y ciudad)', detailsForTeam: 'Detalles para el equipo', detailsPh: 'Vestuario, bailes, estacionamiento, qué traer…',
      rehearsalsLabel: 'Ensayos (visibles al equipo)', rehearsalDate: 'Fecha del ensayo', time: 'Hora', locationNote: 'Lugar / nota', addRehearsal: '+ Agregar ensayo',
      clientSection: 'Contacto del cliente y notas privadas', clientName: 'Nombre del cliente', clientEmail: 'Correo del cliente', clientPhone: 'Teléfono del cliente', clientMessage: 'Mensaje del cliente',
      privateNotes: 'Notas privadas (solo dueños)',
      needTitle: 'Ponle un título al evento.', create: 'Crear', save: 'Guardar', cancel: 'Cancelar', close: 'Cerrar',
      modalNew: 'Nuevo evento', modalEdit: 'Editar evento',
      tapToChange: 'Toca para cambiar',
      editDetails: 'Editar detalles', postAnnouncement: 'Publicar el anuncio', sendReminder: 'Enviar recordatorio', confirmGig: 'Confirmar evento',
      confirmAsk: '¿Confirmar este evento? Se avisará a las familias que dijeron que sí (si hay un canal conectado).', cancelGig: 'Cancelar evento', cancelAsk: '¿Cancelar este evento?',
      postConfirmation: 'Publicar la confirmación', markDone: 'Marcar terminado', gig: 'Evento',
      botEmpty: 'Aún no ha leído mensajes.', botIgnored: 'Ignorado', botNoDancers: 'No supo de qué bailarín se trata', botUnknownSender: 'Remitente desconocido — no nombró a ningún bailarín', botNoEvent: 'No hay evento abierto', botGuessed: '(asumió el evento más reciente)', botLinked: 'GroupMe vinculado', botAmbiguous: 'Nombre ambiguo: {names}', botNoDate: 'No hay evento en esa fecha', botVague: 'Mensaje largo sin fecha — no se aplicó',
      addFamilyFrom: 'Agregar esta familia', reread: 'Leer de nuevo', addFamilyHint: 'Del nombre de GroupMe “{name}”. Revisa cómo se escribe cada bailarín — el bot busca esos nombres en el chat.',
      pickWho: '¿Quién responde?', pickHint: 'Toca tu familia. Te recordaremos en este teléfono.', pickNotListed: '¿No ves a tu familia? Responde en GroupMe y los dueños te agregan.',
      pickClosed: 'Este evento no está recibiendo respuestas.', pickBadLink: 'Ese enlace ya no es válido. Pide uno nuevo a los dueños.',
      chonaAlt: 'La Chona, una robotita dorada con vestido folclórico rojo y verde y trenzas con listones',
      chonaOn: 'Escuchando el chat', chonaOff: 'Todavía no escucha',
      chonaLive: 'Conectada · escuchando el chat', chonaPostOnly: 'Conectada · todavía no escucha',
      chonaListenOnly: 'Escuchando · no puede publicar', chonaDown: 'No conectada',
      botSubOff: 'Todavía no escucha. Configura GROUPME_WEBHOOK_SECRET en el servidor y apunta la URL de callback del bot a /api/webhooks/groupme?secret=… (ver README).',
      postFailed: 'GroupMe no aceptó el mensaje — inténtalo de nuevo',
      guideWho: 'La Chona está en el chat de GroupMe, lee lo que escriben las familias y marca la lista por ti — para que nadie ande contando los “sí” a medianoche.',
      guideSteps: 'Qué hace',
      guideStep1: 'Tocas **Preguntar en GroupMe** en un evento. Ella publica la fecha, el lugar y un ejemplo de respuesta — tú no copias ni pegas nada.',
      guideStep2: 'Las familias responden como quieran — en el chat o tocando su enlace.',
      guideStep3: 'Marca la lista y responde **🤖 Anotado:** para que todos vean que sí entendió.',
      guideStep4: 'Lo que no pudo leer aparece abajo, con un botón para corregirla.',
      guidePosts: 'Qué publica',
      guidePostsSub: 'Palabra por palabra, esto es lo que ve el grupo. Cada uno es un botón del evento — el título es el botón que tocas.',
      guideReads: 'Qué entiende', guideReadsSub: 'Como sea que lo digan, en inglés o español.',
      guideMisses: 'Qué no hace', guideNeedDate: 'Ponle fecha a la pregunta — empareja las respuestas por fecha.',
      guideM1: 'Adivinar un bailarín que no conoce — agrega la familia desde el registro de abajo.',
      guideM2: 'Elegir entre eventos cuando un “sí” no trae fecha; toma la pregunta más reciente.',
      guideM3: 'Dejar que un mensaje viejo reemplace una respuesta más nueva.',
      guideM4: 'Publicar por su cuenta — solo habla cuando tocas un botón aquí.',
      guideFix: '¿Se equivocó? Toca las fichas en la lista del evento. La última palabra siempre es tuya.',
      showOnWebsite: 'Mostrar en el sitio web', hideFromWebsite: 'Quitar del sitio web', websiteOn: 'Ya aparece en bfmh.dance', websiteOff: 'Quitado de bfmh.dance',
      familiesTitle: 'Familias y bailarines', familiesSub: 'Cada familia recibe un enlace privado que la identifica — sin contraseña y sin crear cuenta. “Enviar enlace” lo comparte por mensaje directo de GroupMe o texto; al abrirlo pueden marcar quién está disponible por cada bailarín de su casa, en cada evento que publiques. El enlace sigue funcionando, así que solo se envía una vez. Si llega a alguien fuera de la familia, “Nuevo enlace” lo reemplaza y el anterior deja de servir.',
      familyNamePh: 'Apellido de la familia (p. ej. García)', dancersPh: 'Bailarines separados por comas (p. ej. Luis, Elena)',
      newFamily: 'Nueva familia', addFamily: 'Agregar familia', familyAdded: 'Familia agregada', noFamilies: 'Todavía no hay familias.',
      removeAsk: '¿Quitar a {name}?', addDancer: 'Agregar bailarín', copyInvite: 'Copiar enlace', newLink: 'Nuevo enlace',
      newLinkAsk: '¿Crear un nuevo enlace para {name}? El anterior dejará de funcionar.', removeFamily: 'Quitar familia', removeFamilyAsk: '¿Quitar a la familia {name} y a sus bailarines?',
      roleTeam: 'Equipo', stateNone: 'Sin responder', stateYes: 'Va', stateMaybe: 'Tal vez', stateNo: 'No va',
      waiting: 'sin respuesta', plusWaiting: '+{n} sin respuesta', everyoneAnswered: 'todos respondieron', rosterSettled: 'Lista completa',
      neverAsked: 'Nunca preguntado', askedAgo: 'Preguntado {when}', rehearsalsShort: 'Ensayos',
      inboxEmptyText: 'Nada nuevo del sitio web. Las solicitudes de los formularios de contacto y cotización aparecen aquí solas.',
      inboxEmptyBtn: 'Crear un evento a mano', noGigsFamilyText: 'Aún no hay eventos publicados. Cuando los dueños publiquen uno, avisarán en GroupMe.',
      checkMyDancers: 'Ver mis bailarines', allAnsweredText: 'Todo está respondido. ¡Gracias! Te avisamos cuando se publique el próximo.',
      families: 'Familias', addAFamily: 'Agregar familia', botHeard: 'Lo que escuchó La Chona', botLinkedChip: 'Vinculado', notLinked: 'Sin vincular',
      openGig: 'Abrir evento', addRehearsalShort: 'Agregar ensayo',
      going: 'van', ofNeeded: 'de {n} necesarios', moreNeeded: 'faltan {n}', full: 'Lista completa', noneYet: 'Aún sin respuestas',
      remindWaiting: 'Recordar a {n} sin respuesta', moreActions: 'Más', setAnswerFor: 'Respuesta de {name}', clearAnswer: 'Borrar respuesta',
      waitingOn: 'Sin respuesta', tapGigHint: 'Toca un evento para ver quién va y avisar a quien falta.',
      goingAre: 'Van:',
      everyone: 'Toda la familia', allYes: 'Todos sí', allNo: 'Todos no',
      shareInvite: 'Enviar enlace', inviteMsg: 'El enlace de tu familia para los eventos de Ballet Folklórico Mi Herencia — tócalo para marcar quién puede bailar:',
      refresh: 'Actualizar', tryAgain: 'Reintentar', refreshed: 'Actualizado', answered: 'respondieron', answeredLine: '{n} de {total} respondieron', tapName: 'Toca un nombre para responder por esa persona.',
      when: 'Cuándo', where: 'Dónde', needs: 'Necesita', client: 'Cliente', call: 'Llamar', text: 'Mensaje',
      chatOn: 'La Chona está en el chat', chatOff: 'La Chona no está conectada',
    },
  };
  function t(key, vars) {
    var s = STR[state.lang][key]; if (s === undefined) s = STR.en[key]; if (s === undefined) s = key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.replace('{' + k + '}', vars[k]); });
    return s;
  }
  function detectLang() {
    try { var saved = localStorage.getItem('bfmh_team_lang'); if (saved === 'en' || saved === 'es') return saved; } catch (e) {}
    return /^es/i.test(navigator.language || '') ? 'es' : 'en';
  }
  function setLang(l) {
    state.lang = l; document.documentElement.lang = l;
    try { localStorage.setItem('bfmh_team_lang', l); } catch (e) {}
    render();
  }
  function langToggle() {
    var other = state.lang === 'en' ? 'es' : 'en';
    return h('button', { class: 'btn btn-sm lang-toggle', text: other === 'es' ? 'Español' : 'English', 'aria-label': 'Cambiar idioma / Switch language', onclick: function () { setLang(other); } });
  }
  state.lang = detectLang(); document.documentElement.lang = state.lang;

  /* ── utilities ─────────────────────────────────────────── */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (v === false || v == null) return;
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, child) {
    if (child == null || child === false) return;
    if (Array.isArray(child)) { child.forEach(function (c) { append(el, c); }); return; }
    el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  function parseDate(s) { if (!s) return null; var p = s.slice(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12); }
  function fmtDate(s) {
    var d = parseDate(s); if (!d) return t('dateTbd');
    var M = t('months'), D = t('days');
    return state.lang === 'es' ? D[d.getDay()] + ' ' + d.getDate() + ' ' + M[d.getMonth()].toLowerCase() + ' ' + d.getFullYear()
                              : D[d.getDay()] + ', ' + M[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }
  function fmtTime(ev) { return [ev.start_time, ev.end_time].filter(Boolean).join(' – '); }
  function fmtWhere(ev) { return [ev.venue, ev.city].filter(Boolean).join(' · '); }
  function isPast(ev) { var d = parseDate(ev.event_date); return d && d < new Date(new Date().setHours(0, 0, 0, 0)); }
  function typeLabel(k) { return t('types')[k] || k; }
  function timeAgo(iso) {
    var m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 2) return t('justNow'); if (m < 60) return t('minsAgo', { n: m });
    if (m < 48 * 60) return t('hoursAgo', { n: Math.round(m / 60) }); return t('daysAgo', { n: Math.round(m / 1440) });
  }
  // asked_at is only recorded by the "Ask the group" flow, which shipped on this date. Older gigs
  // were asked by hand, so "Never asked" would be a lie about them - say nothing instead.
  var ASK_TRACKED_FROM = '2026-09-05';
  function askTracked(ev) { return String(ev.created_at || '') >= ASK_TRACKED_FROM; }
  function askedLine(ev) {
    var c = tallyOf(ev);
    if (c.known && !c.pending && (c.yes || c.maybe || c.no)) return h('span', { class: 'askline settled' }, icon('yes', 2), t('rosterSettled'));
    if (!ev.asked_at) return askTracked(ev) && (ev.status === 'open' || ev.status === 'inquiry') ? h('span', { class: 'askline never' }, icon('clock', 2), t('neverAsked')) : null;
    return h('span', { class: 'askline' }, icon('chat', 2), t('askedAgo', { when: '' }).trim() + ' ', h('b', { text: timeAgo(ev.asked_at) }));
  }
  function askedDetail(ev) {
    if (!ev.asked_at) return askTracked(ev) ? h('p', { class: 'hint', text: t('askedNever') }) : null;
    var c = tallyOf(ev), total = c.yes + c.maybe + c.no + c.pending;
    return h('p', { class: 'hint', style: 'margin:0', text: t('askedLine', { when: timeAgo(ev.asked_at), n: total - c.pending, total: total }) });
  }
  function askGroup(ev, after, btn) {
    if (!ev.event_date) { toast(t('askNeedsDate'), true); if (after) after(); openEventModal(ev); return Promise.resolve(); }
    if (btn) btn.disabled = true;
    return api('/api/events/' + ev.id, { method: 'PATCH', body: { action: 'ask' } }).then(function (d) {
      toast(d.notified && d.notified.groupme ? t('askedToast') : t('postFailed'), !(d.notified && d.notified.groupme));
      if (ev.status === 'inquiry') state.tab = 'gigs';
      return refresh().then(after || null);
    }).catch(function (e) { toast(e.message, true); if (btn) btn.disabled = false; });
  }
  function evTitle(ev) { return ev.title || (ev.event_type ? typeLabel(ev.event_type) : t('performance')); }

  var toastTimer;
  function toast(msg, isErr) {
    var el = document.getElementById('toast');
    el.textContent = msg; el.className = 'tm-toast' + (isErr ? ' err' : ''); el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.hidden = true; }, isErr ? 5000 : 2600);
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { toast(t('copied')); });
    var ta = h('textarea', { text: text }); document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast(t('copied')); } catch (e) { toast(t('copyFail'), true); }
    ta.remove(); return Promise.resolve();
  }

  // A cold function/database wake can time out the first request; GETs are safe to retry.
  function api(path, opts) {
    opts = opts || {};
    var init = { method: opts.method || 'GET', headers: {}, credentials: 'same-origin' };
    if (opts.body !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(opts.body); }
    var retries = init.method === 'GET' ? 2 : 0;
    function attempt(left) {
      return fetch(path, init).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (data) {
          if (!r.ok) { var e = new Error(data.error || ('Request failed (' + r.status + ')')); e.status = r.status; throw e; }
          return data;
        });
      }).catch(function (e) {
        if (!left || (e.status && e.status < 500)) throw e;
        return new Promise(function (go) { setTimeout(go, 900); }).then(function () { return attempt(left - 1); });
      });
    }
    return attempt(retries);
  }

  /* ── data loading ──────────────────────────────────────── */
  function loadMe() { return api('/api/me').then(function (me) { state.me = me; return me; }); }
  function loadEvents() { return api('/api/events').then(function (d) { state.events = d.events; state.roster = d.roster || 0; }); }
  function loadFamilies() { return api('/api/families').then(function (d) { state.families = d.families; }); }
  function loadBotLog() { return api('/api/groupme?limit=40').then(function (d) { state.botLog = d.messages; }).catch(function () { state.botLog = []; }); }
  function refresh() {
    state.loadedAt = Date.now();   // claim the slot first: visibilitychange and focus both fire on one foreground
    var jobs = [loadEvents()];
    if (state.me.role === 'admin') { jobs.push(loadFamilies()); if (state.tab === 'chona') jobs.push(loadBotLog()); }
    return Promise.all(jobs).then(function () { state.loadedAt = Date.now(); render(); }, function (e) { toast(e.message, true); });
  }
  function refreshIfStale() {
    if (!state.me || state.me.role === 'anon' || document.hidden) return;
    if (Date.now() - state.loadedAt < 20000) return;
    if (isEditing()) return;
    refresh();
  }
  /* Never yank a half-typed form or an open sheet out from under a thumb. */
  function isEditing() {
    if (document.querySelector('.modal-back form, .pop-back')) return true;
    var el = document.activeElement;
    return !!el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
  }
  document.addEventListener('visibilitychange', refreshIfStale);
  window.addEventListener('focus', refreshIfStale);

  /* ── boot ───────────────────────────────────────────────── */
  function boot() {
    var params = new URLSearchParams(location.search);
    var key = params.get('k');
    if (params.get('lang') === 'es' || params.get('lang') === 'en') setLangSilently(params.get('lang'));
    var chain = Promise.resolve();
    if (key) {
      chain = api('/api/auth', { method: 'POST', body: { key: key } }).then(function () {
        history.replaceState(null, '', location.pathname + location.hash);
      }).catch(function () { toast(t('badLink'), true); });
    }
    if (params.get('e') && params.get('s')) state.gigLink = { e: params.get('e'), s: params.get('s') };
    var m = location.hash.match(/^#event-(\d+)/);
    if (m) state.focusEvent = +m[1];
    chain.then(loadMe).then(function (me) {
      if (me.role === 'anon' && state.gigLink) {
        state.focusEvent = +state.gigLink.e;
        return api('/api/gig?e=' + encodeURIComponent(state.gigLink.e) + '&s=' + encodeURIComponent(state.gigLink.s))
          .then(renderPicker, function () { renderLogin(); toast(t('pickBadLink'), true); });
      }
      if (me.role === 'anon') { renderLogin(); return; }
      if (state.gigLink) { state.focusEvent = +state.gigLink.e; history.replaceState(null, '', location.pathname + '#event-' + state.gigLink.e); }
      if (me.role === 'admin') state.tab = 'inbox';
      return refresh();
    }).catch(function (e) {
      app.innerHTML = '';
      app.appendChild(emptyState('refresh', e.message,
        h('button', { class: 'btn btn-sm btn-gold', text: t('tryAgain'), onclick: function () { location.reload(); } })));
    });
  }
  function setLangSilently(l) { state.lang = l; document.documentElement.lang = l; try { localStorage.setItem('bfmh_team_lang', l); } catch (e) {} }
  function paintBrandRole() { var el = document.getElementById('brand-role'); if (el) el.textContent = t('roleTeam'); }

  /* ── login ──────────────────────────────────────────────── */
  /* A lone password box is a credential a password manager cannot finish: iOS keeps asking for
     "the user name for this account", never saves it, and so never autofills — which is why the
     owners were retyping this on every launch. The name is inert (one shared password opens the
     door) and fixed, so it's kept off-screen (.f-hidden) — it exists only so Face ID has a
     credential to fill, not for anyone to type into. */
  function renderLogin() {
    tabsEl.hidden = true; fabRoot.innerHTML = ''; paintBrandRole();
    headerRight.innerHTML = ''; headerRight.appendChild(langToggle()); app.innerHTML = '';
    var err = h('p', { class: 'error' });
    var who = h('input', { type: 'text', name: 'username', autocomplete: 'username', value: 'Owner', 'aria-hidden': 'true', tabindex: '-1' });
    var pw = h('input', { type: 'password', name: 'password', autocomplete: 'current-password', placeholder: t('ownerPassword') });
    var form = h('form', { class: 'login', onsubmit: function (e) {
      e.preventDefault(); err.textContent = '';
      api('/api/auth', { method: 'POST', body: { password: pw.value } }).then(function () { location.reload(); })
        .catch(function (x) { err.textContent = x.message; });
    } },
      h('h1', { text: t('loginTitle') }),
      h('p', { text: t('loginText') }),
      h('label', { class: 'f f-hidden' }, t('signInAs'), who),
      h('label', { class: 'f' }, t('ownerPassword'), pw),
      h('div', { class: 'card-actions' }, h('button', { class: 'btn btn-gold', type: 'submit', text: t('signIn') })),
      err,
      state.me && state.me.configured === false ? h('p', { class: 'hint', text: t('notConfigured') }) : null
    );
    app.appendChild(form);
  }

  /* Back to the picker, not the login: a shared phone can switch families without the link. */
  function signOut() {
    var back = state.gigLink ? '/team/?e=' + encodeURIComponent(state.gigLink.e) + '&s=' + encodeURIComponent(state.gigLink.s) : '/team/';
    api('/api/auth', { method: 'DELETE' }).then(function () { location.href = back; });
  }

  /* No password here — being in the GroupMe chat is the guest list. */
  function renderPicker(gig) {
    tabsEl.hidden = true; fabRoot.innerHTML = ''; paintBrandRole();
    headerRight.innerHTML = ''; headerRight.appendChild(langToggle()); app.innerHTML = '';

    var ev = gig.event;
    app.appendChild(h('div', { class: 'card' },
      h('div', { class: 'card-head' },
        h('div', { class: 'card-headmain' }, pill(ev.status), h('h3', { class: 'card-title', text: evTitle(ev) }),
          h('p', { class: 'card-meta', text: fmtDate(ev.event_date) }), metaLine(ev)),
        dateBox(ev)),
      ev.details ? h('p', { class: 'card-text', text: ev.details }) : null));

    var pickCal = calButton(ev);
    if (pickCal) {
      app.appendChild(h('div', { class: 'card cal-card' }, h('div', { class: 'card-actions' }, pickCal),
        h('p', { class: 'hint', text: t('addToCalHint') })));
    }

    if (!gig.answering) { app.appendChild(h('p', { class: 'hint', text: t('pickClosed') })); return; }

    var err = h('p', { class: 'error' });
    var picks = h('div', { class: 'pickgrid' }, gig.families.map(function (f) {
      return h('button', { class: 'btn pickbtn', type: 'button', onclick: function () {
        err.textContent = '';
        api('/api/auth', { method: 'POST', body: { family_id: f.id, e: state.gigLink.e, s: state.gigLink.s } })
          .then(function () { location.replace(location.pathname + '#event-' + ev.id); location.reload(); })
          .catch(function (x) { err.textContent = x.message; });
      } }, h('b', { text: f.name }),
        h('span', { class: 'pickkids', text: f.dancers.map(function (d) { return d.name.split(' ')[0]; }).join(', ') }));
    }));

    app.appendChild(h('div', { class: 'card' },
      h('h3', { class: 'card-title', text: t('pickWho') }),
      h('p', { class: 'card-meta', text: t('pickHint') }),
      picks, err,
      h('p', { class: 'hint', text: t('pickNotListed') })));
  }

  /* ── shared pieces ─────────────────────────────────────── */
  var ICONS = {
    yes: '<path d="M20 6 9 17l-5-5"/>',
    maybe: '<path d="M9.2 9.2a3 3 0 1 1 4.4 2.7c-1 .6-1.6 1.3-1.6 2.5"/><path d="M12 18.2v.01"/>',
    no: '<path d="M18 6 6 18M6 6l12 12"/>',
    chat: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.9-.9L3 21l1.9-4.6A8.4 8.4 0 0 1 4 11.5a8.4 8.4 0 0 1 9-8.4 8.4 8.4 0 0 1 8 8.4z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
    allDone: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5a5 5 0 0 1 5.5 5.5"/>',
    more: '<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
    share: '<path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    pin: '<path d="M12 21s-6-5.3-6-11a6 6 0 0 1 12 0c0 5.7-6 11-6 11z"/><circle cx="12" cy="10" r="2"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 21a2 2 0 0 0 4 0"/>',
    edit: '<path d="M4 20h4l10-10-4-4L4 16z"/><path d="m13 7 4 4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
  };
  function icon(name, width) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.setAttribute('viewBox', '0 0 24 24'); el.setAttribute('fill', 'none'); el.setAttribute('stroke', 'currentColor');
    el.setAttribute('stroke-width', width || 2.5); el.setAttribute('stroke-linecap', 'round'); el.setAttribute('stroke-linejoin', 'round');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = ICONS[name] || '';
    return el;
  }
  function section(label, count, extra) {
    return h('div', { class: 'tm-sec' }, h('h2', { class: 'tm-sec-title', text: label }),
      count ? h('span', { class: 'tm-sec-count', text: count }) : null, h('span', { class: 'tm-sec-rule' }), extra || null);
  }
  function emptyState(iconName, text, action) {
    return h('div', { class: 'tm-empty' }, icon(iconName, 1.5), h('p', { text: text }), action || null);
  }
  function dateBox(ev) {
    var d = parseDate(ev.event_date);
    if (!d) return h('div', { class: 'card-date' }, h('span', { class: 'm', text: '—' }), h('span', { class: 'd', text: '?' }), h('span', { class: 'w', text: t('tbd') }));
    return h('div', { class: 'card-date' }, h('span', { class: 'm', text: t('months')[d.getMonth()] }), h('span', { class: 'd', text: d.getDate() }),
      h('span', { class: 'y', text: d.getFullYear() }), h('span', { class: 'w', text: t('days')[d.getDay()] }));
  }
  /* status null = still waiting, not "no". */
  function rosterFor(ev) {
    var answered = {};
    (ev.availability || []).forEach(function (a) { answered[a.dancer_id] = a; });
    var out = [];
    (state.families || []).forEach(function (f) {
      f.dancers.forEach(function (d) {
        if (d.active === false) return;
        var a = answered[d.id];
        out.push({ id: d.id, name: d.name, family: f.name, family_id: f.id, status: a ? a.status : null, note: a ? a.note : null });
      });
    });
    return out;
  }
  /* known = we hold the full roster (owners do; families only see the answers that came in). */
  function tallyOf(ev) {
    var c = { yes: 0, maybe: 0, no: 0, pending: 0, known: true };
    var roster = rosterFor(ev);
    if (roster.length) { roster.forEach(function (p) { c[p.status || 'pending']++; }); return c; }
    (ev.availability || []).forEach(function (a) { c[a.status]++; });
    // Families get the roster size, not the roster: enough for "+3 waiting".
    if (state.roster) c.pending = Math.max(0, state.roster - c.yes - c.maybe - c.no);
    else c.known = false;
    return c;
  }
  var TALLY_COLOR = { yes: 'var(--teal-light)', maybe: 'var(--amber)', no: 'var(--magenta-light)', pending: 'rgba(255,255,255,0.16)' };
  function meterBar(c) {
    var bar = h('div', { class: 'meter' });
    ['yes', 'maybe', 'no'].forEach(function (k) { if (c[k]) bar.appendChild(h('i', { style: 'flex:' + c[k] + ';background:' + TALLY_COLOR[k] })); });
    if (c.pending) bar.appendChild(h('i', { style: 'flex:' + c.pending + ';background:rgba(255,255,255,0.1)' }));
    return bar;
  }
  function tallyRow(c, withLabels) {
    var row = h('div', { class: 'tally' });
    ['yes', 'maybe', 'no'].forEach(function (k) {
      if (!c[k]) return;
      row.appendChild(h('em', {}, h('i', { class: 'tick', style: 'background:' + TALLY_COLOR[k] }), h('b', { text: c[k] }), withLabels ? ' ' + t(k) : ''));
    });
    if (c.pending) row.appendChild(h('em', {}, h('i', { class: 'tick', style: 'background:' + TALLY_COLOR.pending }), h('b', { text: c.pending }), ' ' + t('waiting')));
    else if (c.known) row.appendChild(h('em', { text: t('everyoneAnswered') }));
    return row;
  }
  function goingNames(ev) {
    var yes = (ev.availability || []).filter(function (a) { return a.status === 'yes'; })
      .map(function (a) { return a.dancer_name; }).sort(function (a, b) { return a.localeCompare(b); });
    if (!yes.length) return null;
    return h('div', { class: 'goingnames' }, h('b', { text: t('goingAre') }), h('span', { text: yes.join(', ') }));
  }

  function calHref(ev) {
    if (!ev.event_date) return null;
    if (state.me && state.me.role !== 'anon') return '/api/calendar?event=' + ev.id;
    if (state.gigLink && +state.gigLink.e === +ev.id) {
      return '/api/calendar?e=' + encodeURIComponent(state.gigLink.e) + '&s=' + encodeURIComponent(state.gigLink.s);
    }
    return null;
  }
  function calButton(ev) {
    var href = calHref(ev);
    return href ? h('a', { class: 'btn btn-sm cal-btn', href: href }, icon('calendar', 2.2), t('addToCal')) : null;
  }
  // Only Apple honors webcal:; Google and Outlook need the feed URL handed to their own "add by URL" page.
  function feedName() {
    return state.me.role === 'admin' ? 'Mi Herencia · All gigs' : 'Mi Herencia · ' + state.me.family.name;
  }
  function subscribeSheet() {
    var url = state.me.calendar_feed;
    var pop = popSheet(t('subscribePick'), t('subscribeHint'));
    var list = h('div', { class: 'acts' });
    [
      [t('calApple'), url.replace(/^https?:/, 'webcal:')],
      [t('calGoogle'), 'https://calendar.google.com/calendar/r?cid=' + encodeURIComponent(url)],
      [t('calOutlook'), 'https://outlook.live.com/calendar/0/addfromweb?url=' + encodeURIComponent(url) + '&name=' + encodeURIComponent(feedName())],
    ].forEach(function (row) {
      list.appendChild(h('a', { class: 'act', href: row[1], target: '_blank', rel: 'noopener', onclick: function () { pop.close(); } },
        h('span', { class: 'act-ico' }, icon('calendar', 2)), h('span', { text: row[0] })));
    });
    list.appendChild(h('button', { type: 'button', class: 'act', onclick: function () { pop.close(); copyText(url); } },
      h('span', { class: 'act-ico' }, icon('share', 2)), h('span', { text: t('calCopy') })));
    pop.body.appendChild(list);
    pop.body.appendChild(h('p', { class: 'hint', text: t('calGoogleNote') }));
    pop.body.appendChild(h('button', { type: 'button', class: 'act-close', text: t('cancel'), onclick: pop.close }));
  }
  function subscribeCard(owner) {
    if (!state.me || !state.me.calendar_feed) return null;
    return h('button', { type: 'button', class: 'calsub', onclick: subscribeSheet },
      h('span', { class: 'calsub-ico' }, icon('calendar', 2)),
      h('span', { class: 'calsub-main' },
        h('b', { class: 'calsub-title', text: t(owner ? 'subscribeOwner' : 'subscribe') }),
        h('span', { class: 'calsub-desc', text: t(owner ? 'subscribeWhatOwner' : 'subscribeWhat') })),
      h('span', { class: 'calsub-go' }, icon('chevron', 2.5)));
  }

  /* ── headcount ring ───────────────────────────────────── */
  var SVG_NS = 'http://www.w3.org/2000/svg';
  function ring(pct, color) {
    var r = 44, circ = 2 * Math.PI * r;
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('class', 'ring'); svg.setAttribute('aria-hidden', 'true');
    var bg = document.createElementNS(SVG_NS, 'circle');
    bg.setAttribute('cx', 50); bg.setAttribute('cy', 50); bg.setAttribute('r', r); bg.setAttribute('class', 'ring-bg');
    var fg = document.createElementNS(SVG_NS, 'circle');
    fg.setAttribute('cx', 50); fg.setAttribute('cy', 50); fg.setAttribute('r', r); fg.setAttribute('class', 'ring-fg');
    fg.setAttribute('stroke', color); fg.setAttribute('stroke-dasharray', circ.toFixed(2));
    fg.setAttribute('stroke-dashoffset', (circ * (1 - Math.max(0, Math.min(1, pct)))).toFixed(2));
    svg.appendChild(bg); svg.appendChild(fg);
    return svg;
  }
  function headState(ev, c) {
    var need = +ev.dancers_needed || 0, total = c.yes + c.maybe + c.no + c.pending;
    if (need) return { pct: c.yes / need, full: c.yes >= need, color: c.yes >= need ? 'var(--teal-light)' : 'var(--gold-light)', sub: t('ofNeeded', { n: need }), need: need };
    return { pct: total ? (total - c.pending) / total : 0, full: false, color: c.yes ? 'var(--teal-light)' : 'rgba(255,255,255,0.35)', sub: t('going'), need: 0 };
  }
  function headcount(ev, c) {
    var s = headState(ev, c);
    return h('div', { class: 'hc' + (s.full ? ' is-full' : ''), 'aria-label': c.yes + ' ' + s.sub },
      h('div', { class: 'hc-ring' }, ring(s.pct, s.color), h('b', { text: c.yes })),
      h('span', { class: 'hc-sub', text: s.need ? '/ ' + s.need : t('going') }));
  }
  function hero(ev, c) {
    var s = headState(ev, c);
    var total = c.yes + c.maybe + c.no + c.pending;
    var line;
    if (s.full) line = t('full');
    else if (s.need) line = t('moreNeeded', { n: s.need - c.yes });
    else if (!total || total === c.pending) line = t('noneYet');
    else line = t('answeredLine', { n: total - c.pending, total: total });
    return h('div', { class: 'hero' + (s.full ? ' is-full' : '') },
      h('div', { class: 'hero-ring' }, ring(s.pct, s.color), h('div', { class: 'hero-num' }, h('b', { text: c.yes }), h('span', { text: s.need ? '/ ' + s.need : t('going') }))),
      h('div', { class: 'hero-side' },
        h('p', { class: 'hero-line', text: line }),
        h('div', { class: 'hero-legend' },
          h('em', { class: 'maybe' }, icon('maybe', 3), h('b', { text: c.maybe }), ' ' + t('maybe')),
          h('em', { class: 'no' }, icon('no', 3), h('b', { text: c.no }), ' ' + t('no')),
          h('em', { class: 'pending' }, icon('clock', 2.5), h('b', { text: c.pending }), ' ' + t('waiting')))));
  }
  function pill(status) { return h('span', { class: 'pill pill-' + status, text: t('status')[status] || status }); }
  function metaLine(ev) {
    var parts = [];
    if (fmtTime(ev)) parts.push(h('span', {}, h('b', { text: fmtTime(ev) })));
    if (ev.call_time) parts.push(h('span', { text: t('callTime') + ' ' + ev.call_time }));
    if (fmtWhere(ev)) parts.push(h('span', { text: fmtWhere(ev) }));
    if (ev.dancers_needed) parts.push(h('span', { text: t('dancersNeeded', { n: ev.dancers_needed }) }));
    if (ev.pay && state.me && state.me.role === 'admin') parts.push(h('span', { text: t('pay') + ': ' + ev.pay }));
    var out = h('p', { class: 'card-meta' });
    parts.forEach(function (p, i) { if (i) out.appendChild(document.createTextNode('  ·  ')); out.appendChild(p); });
    return parts.length ? out : null;
  }
  function rehearsalLine(r) { return [fmtDate(r.date), r.time, r.location ? '@ ' + r.location : null, r.note ? '— ' + r.note : null].filter(Boolean).join(' '); }
  function rehearsalList(ev) {
    var list = ev.rehearsals || [];
    if (!list.length) return null;
    return h('div', { class: 'tm-block' }, h('span', { class: 'tm-label', text: t('rehearsals') }),
      h('ul', { class: 'rehearsals' }, list.map(function (r) { return h('li', { text: rehearsalLine(r) }); })));
  }
  function applyLocal(ev, dancer, status) {
    var av = ev.availability = (ev.availability || []).filter(function (a) { return a.dancer_id !== dancer.id; });
    if (status) av.push({ dancer_id: dancer.id, dancer_name: dancer.name, family_id: dancer.family_id, family_name: dancer.family, status: status, note: null });
    av.sort(function (a, b) { return a.dancer_name.localeCompare(b.dancer_name); });
  }
  function setAvail(ev, dancer, status) {
    applyLocal(ev, dancer, status); render();
    toast(status ? dancer.name + ': ' + t(status) : t('answerCleared'));
    return api('/api/availability', { method: 'POST', body: { event_id: ev.id, dancer_id: dancer.id, status: status } })
      .then(function () { return loadEvents(); }).then(render)
      .catch(function (e) { toast(e.message, true); return loadEvents().then(render); });
  }
  function answerSheet(ev, p) {
    var pop = popSheet(t('setAnswerFor', { name: p.name }), p.family || '');
    var grid = h('div', { class: 'ansgrid' });
    [['yes', 'stateYes'], ['maybe', 'stateMaybe'], ['no', 'stateNo']].forEach(function (sk) {
      grid.appendChild(h('button', { type: 'button', class: 'ansbtn ' + sk[0] + (p.status === sk[0] ? ' is-on' : ''),
        onclick: function () { pop.close(); setAvail(ev, p, sk[0]); } }, icon(sk[0], 3), h('span', { text: t(sk[1]) })));
    });
    pop.body.appendChild(grid);
    if (p.status) pop.body.appendChild(h('button', { class: 'btn btn-wide', style: 'margin-top:0.6rem', text: t('clearAnswer'), onclick: function () { pop.close(); setAvail(ev, p, null); } }));
  }

  /* ── member view ───────────────────────────────────────── */
  function renderMember() {
    var me = state.me;
    tabsEl.hidden = true; fabRoot.innerHTML = '';
    paintBrandRole();
    headerRight.innerHTML = '';
    headerRight.appendChild(h('span', { class: 'tm-who' },
      h('span', { class: 'tm-who-label', text: t('familia') }), h('span', { class: 'tm-who-name', text: me.family.name })));
    headerRight.appendChild(langToggle());
    headerRight.appendChild(h('button', { class: 'btn btn-sm', text: t('signOut'), onclick: signOut }));
    app.innerHTML = '';
    me.dancers.forEach(function (d) { d.family = me.family.name; d.family_id = me.family.id; });

    var mine = {}; me.dancers.forEach(function (d) { mine[d.id] = d; });
    function myAnswers(ev) { var out = {}; (ev.availability || []).forEach(function (a) { if (mine[a.dancer_id]) out[a.dancer_id] = a; }); return out; }
    var needs = [], upcoming = [], past = [];
    state.events.forEach(function (ev) {
      if (isPast(ev) || ev.status === 'done') { past.push(ev); return; }
      var ans = myAnswers(ev);
      if (ev.status === 'open' && me.dancers.some(function (d) { return !ans[d.id]; })) needs.push(ev); else upcoming.push(ev);
    });

    if (!me.dancers.length) app.appendChild(h('div', { class: 'card' }, h('p', { class: 'card-meta', text: t('addDancersFirst') })));
    if (needs.length) {
      app.appendChild(section(t('needsAnswer'), needs.length));
      needs.forEach(function (ev) { app.appendChild(memberCard(ev, myAnswers(ev))); });
    }
    app.appendChild(section(t('upcoming')));
    if (!upcoming.length) {
      app.appendChild(needs.length
        ? emptyState('allDone', t('allAnsweredText'))
        : emptyState('calendar', t('noGigsFamilyText'), me.scope === 'pick' ? null
            : h('button', { class: 'btn btn-sm', text: t('checkMyDancers'), onclick: function () {
                var el = document.getElementById('my-family'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              } })));
    }
    upcoming.forEach(function (ev) { app.appendChild(memberCard(ev, myAnswers(ev))); });
    if (past.length) { app.appendChild(section(t('recent'))); past.forEach(function (ev) { app.appendChild(memberCard(ev, myAnswers(ev), true)); }); }

    var famCal = subscribeCard();
    if (famCal) { app.appendChild(section(t('calSection'))); app.appendChild(famCal); }

    /* A picker session may answer but not edit the household: don't offer what the server refuses. */
    if (me.scope !== 'pick') {
      app.appendChild(section(t('myFamily')));
      app.appendChild(familyEditor(me));
    }
    focusIfNeeded();
  }

  function memberCard(ev, answers, readOnly) {
    var me = state.me;
    var needsMe = !readOnly && ev.status === 'open' && me.dancers.some(function (d) { return !answers[d.id]; });
    var card = h('div', { class: 'card' + (needsMe ? ' is-urgent' : ''), id: 'event-' + ev.id },
      h('div', { class: 'card-head' },
        h('div', { class: 'card-headmain' }, pill(ev.status), h('h3', { class: 'card-title', text: evTitle(ev) }),
          h('p', { class: 'card-meta', text: fmtDate(ev.event_date) }), metaLine(ev)),
        dateBox(ev)),
      ev.details ? h('p', { class: 'card-text', text: ev.details }) : null);

    var rehearsals = ev.rehearsals || [];
    if (rehearsals.length) {
      card.appendChild(h('div', { class: 'tm-block' }, h('span', { class: 'tm-label', text: t('rehearsalsShort') }),
        h('ul', { class: 'rehearsals' }, rehearsals.map(function (r) { return h('li', { text: rehearsalLine(r) }); }))));
    }

    if (!readOnly && ['open', 'confirmed'].includes(ev.status) && me.dancers.length) {
      if (me.dancers.length > 1 && me.dancers.some(function (d) { return !answers[d.id]; })) {
        card.appendChild(h('div', { class: 'avrow allrow' },
          h('div', { class: 'avname' }, h('b', { text: t('everyone') })),
          h('div', { class: 'seg seg-2' },
            h('button', { type: 'button', onclick: function () { setAllAvailability(ev, 'yes'); } }, icon('yes'), t('allYes')),
            h('button', { type: 'button', onclick: function () { setAllAvailability(ev, 'no'); } }, icon('no'), t('allNo')))));
      }
      me.dancers.forEach(function (d) {
        var cur = answers[d.id] ? answers[d.id].status : null;
        var seg = h('div', { class: 'seg', role: 'group', 'aria-label': t('availabilityFor', { name: d.name }) });
        [['yes', 'btnYes'], ['maybe', 'btnMaybe'], ['no', 'btnNo']].forEach(function (sk) {
          seg.appendChild(h('button', { type: 'button', class: cur === sk[0] ? 'on-' + sk[0] : '', 'aria-pressed': cur === sk[0] ? 'true' : 'false',
            onclick: function () { setAvail(ev, d, cur === sk[0] ? null : sk[0]); } },
            icon(sk[0]), t(sk[1]).replace(/^[^\s]+\s/, '')));
        });
        card.appendChild(h('div', { class: 'avrow' },
          h('div', { class: 'avname' }, h('b', { text: d.name }),
            h('span', { class: 'avstate' + (cur ? ' ' + cur : ''), text: cur ? t('state' + cur.charAt(0).toUpperCase() + cur.slice(1)) : t('stateNone') })),
          seg));
      });
    }

    var whoBlock = whosIn(ev);
    if (whoBlock) card.appendChild(whoBlock);
    var cal = calButton(ev);
    if (cal) card.appendChild(h('div', { class: 'card-actions' }, cal));
    return card;
  }

  function whosIn(ev) {
    var av = (ev.availability || []).slice();
    if (!av.length) return null;
    var c = tallyOf(ev);
    var order = { yes: 0, maybe: 1, no: 2 };
    av.sort(function (a, b) { return order[a.status] - order[b.status] || a.dancer_name.localeCompare(b.dancer_name); });
    var chips = h('div', { class: 'chips' }, av.map(function (a) {
      return h('span', { class: 'chip ' + a.status, title: a.note || '' }, icon(a.status, 3), a.dancer_name);
    }));
    if (c.pending) chips.appendChild(h('span', { class: 'chip none', text: t('plusWaiting', { n: c.pending }) }));
    return h('div', { class: 'tm-block' }, h('span', { class: 'tm-label', text: t('whosIn') }), meterBar(c), chips);
  }

  function setAllAvailability(ev, status) {
    var me = state.me;
    me.dancers.forEach(function (d) { applyLocal(ev, d, status); });
    render(); toast(t('everyone') + ': ' + t(status));
    Promise.all(me.dancers.map(function (d) {
      return api('/api/availability', { method: 'POST', body: { event_id: ev.id, dancer_id: d.id, status: status } });
    })).then(loadEvents).then(render).catch(function (e) { toast(e.message, true); loadEvents().then(render); });
  }

  function familyEditor(me) {
    var card = h('div', { class: 'card family-card', id: 'my-family' });
    var chips = h('div', { class: 'chips' }, me.dancers.map(function (d) {
      return h('span', { class: 'chip' }, d.name, h('button', { title: t('remove') + ' ' + d.name, text: '✕', onclick: function () {
        confirmSheet(t('removeDancer', { name: d.name }), t('remove'), true).then(function (yes) {
          if (yes) api('/api/dancers?id=' + d.id, { method: 'DELETE' }).then(loadMe).then(refresh).catch(function (e) { toast(e.message, true); });
        });
      } }));
    }));
    var nameIn = h('input', { placeholder: t('addDancerPh'), 'aria-label': t('dancerName') });
    var add = h('form', { class: 'inline-add', onsubmit: function (e) {
      e.preventDefault(); if (!nameIn.value.trim()) return;
      api('/api/dancers', { method: 'POST', body: { name: nameIn.value } }).then(loadMe).then(refresh).catch(function (x) { toast(x.message, true); });
    } }, nameIn, h('button', { class: 'btn btn-sm btn-gold', type: 'submit', text: t('add') }));
    card.appendChild(h('span', { class: 'tm-label', text: t('dancers') }));
    card.appendChild(h('div', { style: 'margin-top:0.5rem' }, chips, h('div', { style: 'margin-top:0.5rem' }, add)));
    return card;
  }

  /* ── admin view ────────────────────────────────────────── */
  var TABS = [['inbox', 'tabInbox', 'mail'], ['gigs', 'tabGigs', 'calendar'], ['team', 'tabTeam', 'people'], ['chona', 'tabChona', null]];
  function renderAdmin() {
    paintBrandRole();
    headerRight.innerHTML = '';
    headerRight.appendChild(h('button', { class: 'btn btn-sm btn-gold hdr-newgig', text: t('newGig'), onclick: function () { openEventModal(null); } }));
    headerRight.appendChild(langToggle());
    headerRight.appendChild(h('button', { class: 'btn btn-sm btn-icon', 'aria-label': t('refresh'), title: t('refresh'), onclick: function () {
      refresh().then(function () { toast(t('refreshed')); }); } }, icon('refresh', 2.2)));
    headerRight.appendChild(h('button', { class: 'btn btn-sm', text: t('signOut'), onclick: signOut }));

    var inquiries = state.events.filter(function (e) { return e.status === 'inquiry'; });
    if (state.focusEvent) {
      var f = state.events.find(function (e) { return e.id === state.focusEvent; });
      if (f) { state.tab = f.status === 'inquiry' ? 'inbox' : 'gigs'; if (f.status !== 'inquiry') { state.detail = f.id; state.focusEvent = null; } }
    }
    var listening = state.me.channels && state.me.channels.groupme_listen;
    tabsEl.hidden = false; tabsEl.innerHTML = '';
    TABS.forEach(function (tb) {
      tabsEl.appendChild(h('button', { class: 'tm-tab' + (state.tab === tb[0] ? ' is-active' : ''), 'aria-current': state.tab === tb[0] ? 'page' : false,
        onclick: function () { state.tab = tb[0]; state.detail = null; render(); if (tb[0] === 'chona' && state.botLog === null) loadBotLog().then(render); } },
        tb[0] === 'chona'
          ? h('span', { class: 'tm-tab-ico' }, h('img', { class: 'tm-tab-face', src: '/images/optimized/la-chona-sm.webp', alt: '' }), h('i', { class: 'tm-tab-dot' + (listening ? ' on' : '') }))
          : h('span', { class: 'tm-tab-ico' }, icon(tb[2], 2)),
        h('span', { class: 'tm-tab-label', text: t(tb[1]) }),
        tb[0] === 'inbox' && inquiries.length ? h('span', { class: 'count', text: inquiries.length }) : null));
    });

    fabRoot.innerHTML = '';
    if (state.tab === 'inbox' || state.tab === 'gigs') {
      fabRoot.appendChild(h('button', { class: 'fab', 'aria-label': t('newGig'), onclick: function () { openEventModal(null); } }, icon('plus', 2.5)));
    }

    app.innerHTML = '';
    if (state.tab === 'inbox') renderInbox(inquiries);
    else if (state.tab === 'gigs') renderGigs();
    else if (state.tab === 'chona') renderChona();
    else renderTeam();
    focusIfNeeded();
  }

  function renderInbox(inquiries) {
    app.appendChild(section(t('newInquiries'), inquiries.length));
    app.appendChild(h('p', { class: 'tm-sub', text: t('inboxSub') }));
    if (!inquiries.length) {
      app.appendChild(emptyState('mail', t('inboxEmptyText'),
        h('button', { class: 'btn btn-sm btn-gold', text: t('inboxEmptyBtn'), onclick: function () { openEventModal(null); } })));
    }
    inquiries.forEach(function (ev) { app.appendChild(adminCard(ev)); });
    var archived = state.events.filter(function (e) { return e.status === 'declined' || e.status === 'cancelled'; });
    if (archived.length) {
      app.appendChild(section(t('archived'), archived.length));
      archived.forEach(function (ev) { app.appendChild(adminCard(ev)); });
    }
  }

  function renderGigs() {
    var live = state.events.filter(function (e) { return (e.status === 'open' || e.status === 'confirmed') && !isPast(e); });
    var past = state.events.filter(function (e) { return e.status === 'done' || ((e.status === 'open' || e.status === 'confirmed') && isPast(e)); });
    app.appendChild(section(t('posted'), live.length));
    app.appendChild(h('p', { class: 'tm-sub', text: t('tapGigHint') }));
    if (!live.length) {
      app.appendChild(emptyState('calendar', t('nothingPosted'),
        h('button', { class: 'btn btn-sm btn-gold', text: t('newGig'), onclick: function () { openEventModal(null); } })));
    } else {
      app.appendChild(gigList(live));
    }
    if (past.length) { app.appendChild(section(t('past'), past.length)); app.appendChild(gigList(past)); }
    var ownerCal = subscribeCard(true);
    if (ownerCal) { app.appendChild(section(t('calSection'))); app.appendChild(ownerCal); }
  }

  function gigList(events) {
    var list = h('div', { class: 'giglist' });
    events.forEach(function (ev) {
      var c = tallyOf(ev);
      var row = h('button', { type: 'button', class: 'gigrow' + (ev.status === 'open' ? ' is-open' : ''), id: 'event-' + ev.id,
        'aria-label': t('openGig') + ': ' + evTitle(ev), onclick: function () { openDetail(ev.id); } },
        dateBox(ev),
        h('div', { class: 'gigmain' },
          h('div', { class: 'gigmain-top' }, h('span', { class: 'card-title sm', text: evTitle(ev) }), pill(ev.status)),
          h('p', { class: 'card-meta', text: [fmtTime(ev), fmtWhere(ev)].filter(Boolean).join('  ·  ') || fmtDate(ev.event_date) }),
          askedLine(ev)),
        headcount(ev, c),
        h('div', { class: 'gigmeter' }, meterBar(c), tallyRow(c), goingNames(ev)),
        h('span', { class: 'giggo' }, icon('chevron', 2.5)));
      list.appendChild(row);
    });
    return list;
  }

  function adminCard(ev) {
    var card = h('div', { class: 'card', id: 'event-' + ev.id });
    card.appendChild(h('div', { class: 'card-head' },
      h('div', { class: 'card-headmain' }, pill(ev.status),
        h('h3', { class: 'card-title sm' }, h('button', { text: ev.title || t('untitled'), onclick: function () { openDetail(ev.id); } })),
        h('p', { class: 'card-meta', text: fmtDate(ev.event_date) + (ev.date_text ? '  ·  “' + ev.date_text + '”' : '') }), metaLine(ev)),
      dateBox(ev)));
    if (ev.status === 'inquiry' || ev.client_name) {
      card.appendChild(clientBlock(ev));
      if (ev.message) card.appendChild(h('p', { class: 'card-text', text: ev.message }));
    }
    var actions = h('div', { class: 'card-actions' });
    if (ev.status === 'inquiry') {
      actions.appendChild(ev.event_date
        ? h('button', { class: 'btn btn-gold btn-main', onclick: function (e) { askGroup(ev, null, e.currentTarget); } }, icon('chat', 2), t('askGroup').replace(/^🙋\s*/, ''))
        : h('button', { class: 'btn btn-gold btn-main', onclick: function () { doAction(ev, 'publish'); } }, icon('chat', 2), t('postToTeam')));
      actions.appendChild(h('button', { class: 'btn btn-icon', 'aria-label': t('moreActions'), onclick: function () { actionSheet(evTitle(ev), inquiryActions(ev)); } }, icon('more', 2)));
    } else {
      actions.appendChild(h('button', { class: 'btn', text: t('reopen'), onclick: function () { doAction(ev, 'reopen'); } }));
      actions.appendChild(h('button', { class: 'btn btn-danger', text: t('del'), onclick: function () { deleteEvent(ev); } }));
    }
    card.appendChild(actions);
    return card;
  }

  function clientBlock(ev) {
    var dl = h('dl', { class: 'kv' });
    if (ev.client_name) dl.appendChild(h('div', {}, h('dt', { text: t('from') }), h('dd', { text: ev.client_name })));
    if (ev.client_email) dl.appendChild(h('div', {}, h('dt', { text: t('email') }), h('dd', {}, h('a', { href: 'mailto:' + ev.client_email, text: ev.client_email }))));
    if (ev.client_phone) {
      var digits = ev.client_phone.replace(/\D/g, '');
      dl.appendChild(h('div', {}, h('dt', { text: t('phone') }), h('dd', { class: 'kv-phone' },
        h('a', { href: 'tel:' + digits, text: ev.client_phone }),
        h('span', { class: 'kv-btns' },
          h('a', { class: 'btn btn-sm', href: 'tel:' + digits }, icon('phone', 2.2), t('call')),
          h('a', { class: 'btn btn-sm', href: 'sms:' + digits }, icon('chat', 2.2), t('text'))))));
    }
    if (ev.event_type) dl.appendChild(h('div', {}, h('dt', { text: t('type') }), h('dd', { text: typeLabel(ev.event_type) })));
    dl.appendChild(h('div', {}, h('dt', { text: t('received') }), h('dd', { text: new Date(ev.created_at).toLocaleString(state.lang === 'es' ? 'es-US' : 'en-US') + (ev.source ? ' ' + t('via') + ' ' + ev.source : '') })));
    return dl;
  }

  function websiteAction(ev) {
    return { label: ev.website ? t('hideFromWebsite') : t('showOnWebsite'), icon: 'globe', onclick: function () {
      api('/api/events/' + ev.id, { method: 'PATCH', body: { website: !ev.website } })
        .then(function () { toast(ev.website ? t('websiteOff') : t('websiteOn')); return refresh(); })
        .catch(function (e) { toast(e.message, true); });
    } };
  }
  function doAction(ev, action, extra) {
    var body = Object.assign({ action: action }, extra || {});
    return api('/api/events/' + ev.id, { method: 'PATCH', body: body }).then(function (d) {
      var n = d.notified;
      if (n && n.groupme) toast(t('donePosted', { ch: t('groupme') }));
      else if (n) toast(t('postFailed'), true);
      else toast(t('done'));
      return d;
    }).then(function (d) { return refresh().then(function () { return d; }); }).catch(function (e) { toast(e.message, true); });
  }
  function deleteEvent(ev) {
    confirmSheet(t('deleteConfirm', { title: ev.title || t('thisEvent') }), t('del'), true).then(function (yes) {
      if (!yes) return;
      state.detail = null;
      api('/api/events/' + ev.id, { method: 'DELETE' }).then(refresh).catch(function (e) { toast(e.message, true); });
    });
  }

  /* ── sheets ────────────────────────────────────────────── */
  function closeModal() { document.getElementById('modal-root').innerHTML = ''; }
  function modal(title, body, footer, opts) {
    opts = opts || {};
    var root = document.getElementById('modal-root');
    root.innerHTML = '';
    var box = h('div', { class: 'modal' + (opts.cls ? ' ' + opts.cls : ''), role: 'dialog', 'aria-modal': 'true' },
      h('div', { class: 'modal-head' }, h('h2', {}, title), h('button', { class: 'modal-x', 'aria-label': t('close'), onclick: opts.onclose || closeModal }, icon('close', 2.2))),
      h('div', { class: 'modal-body' }, body),
      footer ? h('div', { class: 'modal-foot' }, footer) : null);
    root.appendChild(h('div', { class: 'modal-back', onclick: function (e) { if (e.target === e.currentTarget) (opts.onclose || closeModal)(); } }, box));
    if (!opts.noFocus) { var first = box.querySelector('.modal-body input, .modal-body select, .modal-body textarea'); if (first) first.focus(); }
    return box;
  }
  function popSheet(title, sub) {
    var body = h('div', { class: 'pop-body' });
    var back = h('div', { class: 'modal-back pop-back', onclick: function (e) { if (e.target === e.currentTarget) close(); } },
      h('div', { class: 'pop', role: 'dialog', 'aria-modal': 'true' },
        h('div', { class: 'pop-grip' }),
        title ? h('div', { class: 'pop-head' }, h('h3', { text: title }), sub ? h('p', { text: sub }) : null) : null,
        body));
    function close() { back.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    document.body.appendChild(back);
    return { el: back, body: body, close: close };
  }
  function confirmSheet(message, okLabel, danger) {
    return new Promise(function (resolve) {
      var pop = popSheet(null);
      pop.body.appendChild(h('p', { class: 'pop-msg', text: message }));
      pop.body.appendChild(h('div', { class: 'pop-btns' },
        h('button', { class: 'btn btn-wide ' + (danger ? 'btn-danger-fill' : 'btn-gold'), text: okLabel || t('done'), onclick: function () { pop.close(); resolve(true); } }),
        h('button', { class: 'btn btn-wide', text: t('cancel'), onclick: function () { pop.close(); resolve(false); } })));
      pop.el.addEventListener('click', function (e) { if (e.target === pop.el) resolve(false); });
    });
  }
  /* items: [{ label, icon, cls, onclick }] — null entries are skipped. */
  function actionSheet(title, items) {
    var pop = popSheet(title);
    var list = h('div', { class: 'acts' });
    items.forEach(function (it) {
      if (!it) return;
      list.appendChild(h('button', { class: 'act' + (it.cls ? ' ' + it.cls : ''), onclick: function () { pop.close(); it.onclick(); } },
        h('span', { class: 'act-ico' }, it.icon ? icon(it.icon, 2) : null), h('span', { text: it.label })));
    });
    pop.body.appendChild(list);
    // Without this, the last action reads as a list clipped by the browser toolbar.
    pop.body.appendChild(h('button', { type: 'button', class: 'act-close', text: t('cancel'), onclick: pop.close }));
    return pop;
  }

  /* ── event form (create / edit / publish) ──────────────── */
  function field(label, input, full, required) {
    return h('label', { class: 'f' + (full ? ' full' : '') },
      h('span', { class: 'f-label' }, label, required ? h('i', { class: 'req', text: t('requiredTag') }) : null), input);
  }
  function inp(name, ev, attrs) { return h('input', Object.assign({ name: name, value: ev && ev[name] != null ? ev[name] : '' }, attrs || {})); }

  function openEventModal(ev) {
    ev = ev || {};
    var isNew = !ev.id;
    var back = state.detail; state.detail = null;   // the sheet comes back when the form closes
    function done() { closeModal(); if (back) openDetail(back); }
    var types = t('types');
    var typeSel = h('select', { name: 'event_type' }, h('option', { value: '', text: t('typePh') }), Object.keys(types).map(function (k) {
      return h('option', { value: k, text: types[k], selected: ev.event_type === k });
    }));
    var rehearsals = (ev.rehearsals || []).slice();
    var rehBox = h('div', { class: 'full' });
    function renderReh() {
      rehBox.innerHTML = '';
      rehBox.appendChild(h('span', { class: 'tm-label', text: t('rehearsalsLabel') }));
      rehearsals.forEach(function (r, i) {
        rehBox.appendChild(h('div', { class: 'rehrow' },
          h('input', { type: 'date', value: r.date || '', 'aria-label': t('rehearsalDate'), oninput: function (e) { r.date = e.target.value; } }),
          h('input', { placeholder: t('time'), value: r.time || '', oninput: function (e) { r.time = e.target.value; } }),
          h('input', { placeholder: t('locationNote'), value: r.location || '', oninput: function (e) { r.location = e.target.value; } }),
          h('button', { type: 'button', class: 'btn btn-sm btn-danger btn-icon', 'aria-label': t('remove'), onclick: function () { rehearsals.splice(i, 1); renderReh(); } }, icon('close', 2.2))));
      });
      rehBox.appendChild(h('button', { type: 'button', class: 'btn btn-sm', text: t('addRehearsal'), onclick: function () { rehearsals.push({}); renderReh(); } }));
    }
    renderReh();
    var err = h('p', { class: 'error' });
    var form = h('form', { class: 'form-grid', id: 'event-form', onsubmit: function (e) {
      e.preventDefault(); err.textContent = '';
      var fd = new FormData(form); var body = {};
      fd.forEach(function (v, k) { body[k] = v; });
      body.rehearsals = rehearsals.filter(function (r) { return r.date || r.time || r.location; });
      if (!body.title) { err.textContent = t('needTitle'); return; }
      var p;
      if (isNew) {
        body.status = 'inquiry';
        p = api('/api/events', { method: 'POST', body: body });
      } else {
        p = api('/api/events/' + ev.id, { method: 'PATCH', body: body });
      }
      p.then(function () {
        closeModal();
        toast(t('saved'));
        if (back) state.detail = back;
        return refresh();
      }).catch(function (x) { err.textContent = x.message; });
    } },
      field(t('title'), inp('title', ev, { placeholder: t('titlePh'), required: true }), true, true),
      h('div', { class: 'form-sep full' }, h('span', { class: 'tm-label', text: t('optionalHead') })),
      field(t('dateLabel'), inp('event_date', ev, { type: 'date' })),
      field(t('typeLabel'), typeSel),
      field(t('startTime'), inp('start_time', ev, { placeholder: '7:00 PM' })),
      field(t('endTime'), inp('end_time', ev, { placeholder: '7:30 PM' })),
      field(t('callTime'), inp('call_time', ev, { placeholder: '6:15 PM' })),
      field(t('dancersNeededLabel'), inp('dancers_needed', ev, { type: 'number', min: 0, inputmode: 'numeric' })),
      field(t('venue'), inp('venue', ev, { placeholder: 'Grand Ballroom' })),
      field(t('city'), inp('city', ev, { placeholder: 'West Covina' })),
      field(t('address'), inp('address', ev, {}), true),
      field(t('payLabel'), inp('pay', ev, { placeholder: t('payPh') })),
      ev.date_text ? field(t('clientWrote'), h('input', { value: ev.date_text, disabled: true })) : null,
      field(t('detailsForTeam'), h('textarea', { name: 'details', text: ev.details || '', placeholder: t('detailsPh') }), true),
      rehBox,
      h('details', { class: 'full' }, h('summary', { class: 'summary' }, t('clientSection')),
        h('div', { class: 'form-grid', style: 'margin-top:0.6rem' },
          field(t('clientName'), inp('client_name', ev)), field(t('clientEmail'), inp('client_email', ev, { type: 'email' })), field(t('clientPhone'), inp('client_phone', ev, { type: 'tel' })),
          field(t('clientMessage'), h('textarea', { name: 'message', text: ev.message || '' }), true),
          field(t('privateNotes'), h('textarea', { name: 'notes', text: ev.notes || '' }), true))),
      h('div', { class: 'full' }, err));
    var foot = h('div', { class: 'foot-btns' },
      h('button', { class: 'btn btn-gold btn-main', type: 'submit', form: 'event-form', text: isNew ? t('create') : t('save') }),
      h('button', { class: 'btn', type: 'button', text: t('cancel'), onclick: done }));
    modal(isNew ? t('modalNew') : t('modalEdit'), form, foot, { onclose: done });
  }

  /* ── gig detail sheet (owner) ──────────────────────────── */
  function openDetail(id) { state.detail = id; render(); }
  function closeDetail() { state.detail = null; closeModal(); }

  // Publishing takes no date, so it is the only way a "date TBD" gig reaches the families:
  // askGroup and the server's 'ask' both refuse an event with no event_date.
  function postToTeam(ev) { return { label: t('postToTeam'), icon: 'chat', onclick: function () { doAction(ev, 'publish'); } }; }
  function inquiryActions(ev) {
    return [
      ev.event_date ? postToTeam(ev) : null,
      { label: t('edit'), icon: 'edit', onclick: function () { openEventModal(ev); } },
      { label: t('decline'), icon: 'no', cls: 'danger', onclick: function () { doAction(ev, 'decline').then(closeDetail); } },
      { label: t('del'), icon: 'trash', cls: 'danger', onclick: function () { deleteEvent(ev); } },
    ];
  }
  function primaryFor(ev, c) {
    var s = ev.status;
    var confirmIt = function () {
      confirmSheet(t('confirmAsk'), t('confirmGig')).then(function (yes) { if (yes) doAction(ev, 'confirm'); });
    };
    var cancelIt = function () {
      confirmSheet(t('cancelAsk'), t('cancelGig'), true).then(function (yes) { if (yes) doAction(ev, 'cancel').then(closeDetail); });
    };
    var remind = { label: t('sendReminder'), icon: 'bell', onclick: function () { doAction(ev, 'remind'); } };
    var edit = { label: t('editDetails'), icon: 'edit', onclick: function () { openEventModal(ev); } };
    var out = { primary: null, more: [] };
    if (s === 'inquiry') {
      out.primary = ev.event_date
        ? { label: t('askGroup').replace(/^🙋\s*/, ''), icon: 'chat', onclick: function (e) { askGroup(ev, null, e.currentTarget); } }
        : postToTeam(ev);
      out.more = inquiryActions(ev);
    } else if (s === 'open') {
      if (!ev.asked_at) out.primary = { label: t('askGroup').replace(/^🙋\s*/, ''), icon: 'chat', onclick: function (e) { askGroup(ev, null, e.currentTarget); } };
      else if (c.pending) out.primary = { label: t('remindWaiting', { n: c.pending }), icon: 'bell', onclick: function () { doAction(ev, 'remind'); } };
      else out.primary = { label: t('confirmGig'), icon: 'yes', cls: 'btn-teal', onclick: confirmIt };
      out.more = [
        { label: ev.asked_at ? t('askAgain') : t('askGroup').replace(/^🙋\s*/, ''), icon: 'chat', onclick: function () { askGroup(ev); } },
        { label: t('postTally'), icon: 'people', onclick: function () { doAction(ev, 'tally'); } },
        { label: t('postAnnouncement'), icon: 'mail', onclick: function () { doAction(ev, 'announce'); } },
        remind, edit,
        { label: t('confirmGig'), icon: 'yes', onclick: confirmIt },
        { label: t('cancelGig'), icon: 'no', cls: 'danger', onclick: cancelIt },
      ];
    } else if (s === 'confirmed') {
      out.primary = isPast(ev)
        ? { label: t('markDone'), icon: 'allDone', cls: 'btn-teal', onclick: function () { doAction(ev, 'done'); } }
        : { label: t('postConfirmation'), icon: 'chat', onclick: function () { doAction(ev, 'reconfirm'); } };
      out.more = [
        remind,
        websiteAction(ev),
        edit,
        { label: t('markDone'), icon: 'allDone', onclick: function () { doAction(ev, 'done'); } },
        { label: t('cancelGig'), icon: 'no', cls: 'danger', onclick: cancelIt },
      ];
    } else if (s === 'done') {
      out.primary = websiteAction(ev);
      out.more = [edit, { label: t('reopen'), icon: 'refresh', onclick: function () { doAction(ev, 'reopen'); } },
        { label: t('del'), icon: 'trash', cls: 'danger', onclick: function () { deleteEvent(ev); } }];
    } else {
      // 'ask' is rejected server-side for a declined/cancelled gig, so reopening is the only way forward.
      out.primary = { label: t('reopen'), icon: 'refresh', onclick: function () { doAction(ev, 'reopen'); } };
      out.more = [edit, { label: t('del'), icon: 'trash', cls: 'danger', onclick: function () { deleteEvent(ev); } }];
    }
    return out;
  }

  function renderDetailSheet() {
    var ev = state.events.find(function (e) { return e.id === state.detail; });
    if (!ev) { state.detail = null; closeModal(); return; }
    var c = tallyOf(ev);
    var body = h('div', { class: 'detail' });

    body.appendChild(h('div', { class: 'detail-top' },
      dateBox(ev),
      h('div', { class: 'detail-title' }, h('h3', { class: 'card-title', text: evTitle(ev) }), h('p', { class: 'card-meta', text: fmtDate(ev.event_date) }))));

    body.appendChild(hero(ev, c));

    var facts = h('div', { class: 'facts' });
    if (fmtTime(ev) || ev.call_time) facts.appendChild(h('div', { class: 'fact' }, icon('clock', 2), h('span', {}, fmtTime(ev) ? h('b', { text: fmtTime(ev) }) : null, ev.call_time ? ' · ' + t('callTime') + ' ' + ev.call_time : '')));
    if (fmtWhere(ev) || ev.address) {
      var q = encodeURIComponent([ev.venue, ev.address, ev.city].filter(Boolean).join(', '));
      facts.appendChild(h('div', { class: 'fact' }, icon('pin', 2), h('a', { href: 'https://maps.apple.com/?q=' + q, target: '_blank', rel: 'noopener', text: [fmtWhere(ev), ev.address].filter(Boolean).join(' · ') })));
    }
    if (ev.dancers_needed) facts.appendChild(h('div', { class: 'fact' }, icon('people', 2), h('span', { text: t('dancersNeeded', { n: ev.dancers_needed }) })));
    if (ev.pay && state.me && state.me.role === 'admin') facts.appendChild(h('div', { class: 'fact' }, h('span', { class: 'fact-sym', text: '$' }), h('span', { text: t('pay') + ': ' + ev.pay })));
    if (facts.childNodes.length) body.appendChild(facts);
    var detailCal = calButton(ev);
    if (detailCal) body.appendChild(h('div', { class: 'card-actions' }, detailCal));

    var roster = rosterFor(ev);
    if (roster.length) {
      var groups = { yes: [], maybe: [], no: [], pending: [] };
      roster.forEach(function (p) { groups[p.status || 'pending'].push(p); });
      var box = h('div', { class: 'groups' });
      [['yes', 'stateYes'], ['maybe', 'stateMaybe'], ['no', 'stateNo'], ['pending', 'waitingOn']].forEach(function (g) {
        var people = groups[g[0]].sort(function (a, b) { return a.name.localeCompare(b.name); });
        if (!people.length) return;
        var grp = h('div', { class: 'group ' + g[0] },
          h('div', { class: 'group-head' }, h('span', { class: 'group-title' }, g[0] === 'pending' ? icon('clock', 2.5) : icon(g[0], 3), t(g[1])), h('b', { text: people.length })));
        var names = h('div', { class: 'names' });
        people.forEach(function (p) {
          names.appendChild(h('button', { type: 'button', class: 'name', title: p.note || t('tapToChange'), onclick: function () { answerSheet(ev, p); } },
            h('span', { class: 'name-n', text: p.name }), h('span', { class: 'name-f', text: p.family })));
        });
        grp.appendChild(names);
        box.appendChild(grp);
      });
      body.appendChild(box);
      body.appendChild(h('p', { class: 'hint', text: t('tapName') }));
    }

    if (ev.details) body.appendChild(h('div', { class: 'tm-block' }, h('span', { class: 'tm-label', text: t('detailsForTeam') }), h('p', { class: 'card-text', style: 'margin:0', text: ev.details })));
    var reh = rehearsalList(ev); if (reh) body.appendChild(reh);
    if (ev.client_name || ev.client_phone || ev.client_email) body.appendChild(h('div', { class: 'tm-block' }, h('span', { class: 'tm-label', text: t('client') }), clientBlock(ev)));
    if (ev.message) body.appendChild(h('p', { class: 'card-text', text: '“' + ev.message + '”' }));
    if (ev.notes) body.appendChild(h('div', { class: 'tm-block' }, h('span', { class: 'tm-label', text: t('privateNotes') }), h('p', { class: 'card-text', style: 'margin:0', text: ev.notes })));
    var asked = askedDetail(ev); if (asked) body.appendChild(asked);

    var acts = primaryFor(ev, c);
    var foot = h('div', { class: 'foot-btns' },
      h('button', { class: 'btn btn-main ' + (acts.primary.cls || 'btn-gold'), onclick: acts.primary.onclick }, icon(acts.primary.icon, 2), acts.primary.label),
      h('button', { class: 'btn btn-icon', 'aria-label': t('moreActions'), onclick: function () { actionSheet(evTitle(ev), acts.more); } }, icon('more', 2)));

    var title = h('span', { class: 'modal-title' }, pill(ev.status));
    var prev = document.querySelector('#modal-root .modal-body'); var scrollTop = prev ? prev.scrollTop : 0;
    modal(title, body, foot, { cls: 'modal-detail', onclose: closeDetail, noFocus: true });
    var nb = document.querySelector('#modal-root .modal-body'); if (nb && scrollTop) nb.scrollTop = scrollTop;
  }

  /* ── team (families) ───────────────────────────────────── */
  function renderTeam() {
    var name = h('input', { placeholder: t('familyNamePh'), required: true });
    var dancers = h('input', { placeholder: t('dancersPh') });
    var form = h('form', { class: 'card form-grid', hidden: true, onsubmit: function (e) {
      e.preventDefault();
      api('/api/families', { method: 'POST', body: { name: name.value, dancers: dancers.value } })
        .then(function () { toast(t('familyAdded')); return refresh(); }).catch(function (x) { toast(x.message, true); });
    } },
      field(t('newFamily'), name), field(t('dancers'), dancers, true),
      h('div', { class: 'full card-actions' }, h('button', { class: 'btn btn-gold', type: 'submit', text: t('addFamily') })));

    app.appendChild(section(t('families'), state.families.length,
      h('button', { class: 'btn btn-sm btn-gold', text: t('addAFamily'), onclick: function () { form.hidden = !form.hidden; if (!form.hidden) name.focus(); } })));
    app.appendChild(h('p', { class: 'tm-sub', text: t('familiesSub') }));
    app.appendChild(form);

    if (!state.families.length) app.appendChild(emptyState('calendar', t('noFamilies')));
    var grid = h('div', { class: 'famgrid' });
    state.families.forEach(function (f) {
      var card = h('div', { class: 'card family-card' + (f.groupme_user_id ? '' : ' quiet') });
      card.appendChild(h('div', { class: 'fam-top' }, h('h3', { class: 'card-title sm', text: f.name }),
        f.groupme_user_id ? h('span', { class: 'chip yes' }, icon('yes', 3), t('botLinkedChip')) : h('span', { class: 'chip none', text: t('notLinked') })));
      card.appendChild(h('div', { class: 'chips' }, f.dancers.map(function (d) {
        return h('span', { class: 'chip' + (d.active ? '' : ' is-off') }, d.name, h('button', { text: '✕', title: t('remove') + ' ' + d.name, onclick: function () {
          confirmSheet(t('removeAsk', { name: d.name }), t('remove'), true).then(function (yes) { if (yes) api('/api/dancers?id=' + d.id, { method: 'DELETE' }).then(refresh); });
        } }));
      })));
      var dn = h('input', { placeholder: t('addDancer'), 'aria-label': t('addDancer') });
      card.appendChild(h('form', { class: 'inline-add', onsubmit: function (e) {
        e.preventDefault(); if (!dn.value.trim()) return;
        api('/api/dancers', { method: 'POST', body: { family_id: f.id, name: dn.value } }).then(refresh).catch(function (x) { toast(x.message, true); });
      } }, dn, h('button', { class: 'btn btn-sm', type: 'submit', text: t('add') })));
      card.appendChild(h('div', { class: 'card-actions', style: 'margin:0' },
        navigator.share
          ? h('button', { class: 'btn btn-sm btn-gold', onclick: function () { shareInvite(f); } }, icon('share', 2.2), t('shareInvite'))
          : h('button', { class: 'btn btn-sm btn-gold', text: t('copyInvite'), onclick: function () { copyText(f.invite_link); } }),
        navigator.share ? h('button', { class: 'btn btn-sm', text: t('copyInvite'), onclick: function () { copyText(f.invite_link); } }) : null,
        h('button', { class: 'btn btn-sm btn-icon', 'aria-label': t('moreActions'), onclick: function () {
          actionSheet(f.name, [
            { label: t('newLink'), icon: 'refresh', onclick: function () {
              confirmSheet(t('newLinkAsk', { name: f.name }), t('newLink')).then(function (yes) {
                if (!yes) return;
                api('/api/families?id=' + f.id, { method: 'PATCH', body: { action: 'rotate' } }).then(function (d) { copyText(d.invite_link); return refresh(); });
              }); } },
            { label: t('removeFamily'), icon: 'trash', cls: 'danger', onclick: function () {
              confirmSheet(t('removeFamilyAsk', { name: f.name }), t('removeFamily'), true).then(function (yes) {
                if (yes) api('/api/families?id=' + f.id, { method: 'DELETE' }).then(refresh);
              }); } },
          ]);
        } }, icon('more', 2))));
      grid.appendChild(card);
    });
    app.appendChild(grid);
  }

  function shareInvite(f) {
    navigator.share({ title: 'Ballet Folklórico Mi Herencia', text: t('inviteMsg'), url: f.invite_link })
      .catch(function (e) { if (e && e.name !== 'AbortError') copyText(f.invite_link); });
  }

  var MARK = { yes: '✓', maybe: '?', no: '✗' };
  function botResultText(m) {
    var r = m.result || {};
    if (m.applied) {
      var byEv = {}; var order = [];
      (r.updates || []).forEach(function (u) {
        var k = u.event_date || u.event_title || u.event_id;
        if (!byEv[k]) { byEv[k] = []; order.push(k); }
        byEv[k].push(u.dancer_name.split(' ')[0] + ' ' + MARK[u.status]);
      });
      order.sort();
      return order.map(function (k) { return (/^\d{4}-/.test(k) ? fmtDate(k) : k) + ': ' + byEv[k].join(' · '); }).join('  ·  ') + (r.event_guessed ? ' ' + t('botGuessed') : '');
    }
    var why = { 'no-intent': t('botIgnored'), 'no-dancers': t('botNoDancers'), 'unknown-sender': t('botUnknownSender'), 'no-open-event': t('botNoEvent'), 'no-event-for-date': t('botNoDate'), 'too-vague': t('botVague') }[r.reason] || t('botIgnored');
    if (r.ambiguous && r.ambiguous.length) why += ' — ' + t('botAmbiguous', { names: r.ambiguous.join(', ') });
    return why;
  }
  /* Bold runs come through as **…** so each explainer stays one translatable string. */
  function rich(s) {
    var frag = document.createDocumentFragment();
    String(s).split(/\*\*/).forEach(function (part, i) {
      if (!part) return;
      frag.appendChild(i % 2 ? h('b', { text: part }) : document.createTextNode(part));
    });
    return frag;
  }

  var BOT_EXAMPLES = [
    ['Sofia yes for Nov 4', 'Sofia ✓'],
    ['we can’t', 'whole family ✗'],
    ['no podemos el 9/20', 'family ✗ · Sep 20'],
    ['My girls yes at Oct 13', 'both dancers ✓'],
  ];

  /* Verbatim from the server's builders in api/_lib/notify.js — if the wording there changes,
     change it here too. Her posts stay English; only the tap lines are bilingual. */
  var BOT_POSTS = [
    ['askGroup', [
      '🙋 Who can dance: Quinceañera — Ramirez',
      'Wed, Nov 4 · 7:00 PM–7:30 PM · Grand Ballroom, West Covina',
      'Reply "Sofia yes for Nov 4" or "we can\'t".',
      'Or tap / O toca: https://bfmh.dance/team/?e=42&s=…',
      '📅 Save the date / Guardar la fecha: https://bfmh.dance/api/calendar?e=42&s=…',
    ]],
    ['postAnnouncement', [
      '📣 New gig: are you available?',
      'Quinceañera — Ramirez — Wed, Nov 4, 2026',
      'Time: 7:00 PM–7:30 PM',
      'Call time: 6:15 PM',
      'Where: Grand Ballroom, 1200 E Garvey Ave, West Covina',
      'Dancers needed: 6',
      '',
      '📅 Save the date / Guardar la fecha:',
      'https://bfmh.dance/api/calendar?e=42&s=…',
      '',
      'Mark your availability: https://bfmh.dance/team/?e=42&s=…',
    ]],
    ['postTally', [
      '📊 Quinceañera — Ramirez — Wed, Nov 4',
      '✓ Sofia, Ashley',
      '? Emily',
      '✗ Luis',
      'Waiting on: Elena',
    ]],
    ['sendReminder', [
      '⏰ Reminder — Quinceañera — Ramirez on Wed, Nov 4, 2026. Still need an answer from: Elena Ramos.',
      'https://bfmh.dance/team/?e=42&s=…',
    ]],
    ['postConfirmation', [
      '✅ CONFIRMED: Quinceañera — Ramirez — Wed, Nov 4, 2026',
      'Time: 7:00 PM–7:30 PM',
      'Call time: 6:15 PM',
      'Where: Grand Ballroom, 1200 E Garvey Ave, West Covina',
      '',
      '📅 Save to your calendar / Guardar en tu calendario:',
      'https://bfmh.dance/api/calendar?e=42&s=…',
      '',
      'Dancers: Sofia Garcia, Ashley Orozco',
      '',
      'Rehearsals:',
      '• Wed, Oct 28, 2026 6:00 PM @ Studio B',
      '',
      'Details: https://bfmh.dance/team/?e=42&s=…',
    ]],
  ];

  function renderChona() {
    var listening = state.me.channels && state.me.channels.groupme_listen;
    /* Posting and listening are separate secrets: one can be green while the other is dark. */
    var posting = state.me.channels && state.me.channels.groupme;

    app.appendChild(h('div', { class: 'chona-hero' },
      h('img', { class: 'chona-portrait', src: '/images/optimized/la-chona-badge.webp', width: 256, height: 256,
        alt: t('chonaAlt') }),
      h('div', { class: 'chona-intro' },
        h('h2', { class: 'chona-name', text: 'La Chona' }),
        h('div', { class: 'chona-states' },
          h('span', { class: 'chona-state ' + (posting && listening ? 'on' : posting || listening ? 'half' : 'off') },
            h('i', { class: 'dot' }),
            t(posting && listening ? 'chonaLive' : posting ? 'chonaPostOnly' : listening ? 'chonaListenOnly' : 'chonaDown'))),
        h('p', { class: 'guide-who', text: t('guideWho') }))));

    if (!posting) app.appendChild(h('p', { class: 'tm-sub', text: t('groupmeOff') }));
    if (!listening) app.appendChild(h('p', { class: 'tm-sub', text: t('botSubOff') }));

    var steps = h('ol', { class: 'guide-steps' },
      [t('guideStep1'), t('guideStep2'), t('guideStep3'), t('guideStep4')].map(function (x) { return h('li', {}, rich(x)); }));

    var says = h('div', { class: 'guide-posts' }, BOT_POSTS.map(function (pp) {
      return h('div', { class: 'gpost' },
        h('span', { class: 'gpost-cap' }, icon('chat', 2), t(pp[0]).replace(/^🙋\s*/, '')),
        h('div', { class: 'gpost-bubble', text: pp[1].join('\n') }));
    }));

    var reads = h('table', { class: 'guide-ex' }, h('tbody', {}, BOT_EXAMPLES.map(function (r) {
      return h('tr', {}, h('td', { class: 'gx-in', text: '\u201c' + r[0] + '\u201d' }), h('td', { class: 'gx-out', text: r[1] }));
    })));

    var misses = h('ul', { class: 'guide-no' },
      [t('guideM1'), t('guideM2'), t('guideM3'), t('guideM4')].map(function (x) { return h('li', { text: x }); }));

    app.appendChild(h('div', { class: 'card guide-body' },
      h('span', { class: 'tm-label', text: t('guideSteps') }), steps,
      h('span', { class: 'tm-label', text: t('guidePosts') }),
      h('p', { class: 'guide-sub', text: t('guidePostsSub') }), says,
      h('span', { class: 'tm-label', text: t('guideReads') }),
      h('p', { class: 'guide-sub', text: t('guideReadsSub') }), reads,
      h('span', { class: 'tm-label', text: t('guideMisses') }), misses,
      h('p', { class: 'hint', text: t('guideNeedDate') }),
      h('p', { class: 'guide-fix', text: t('guideFix') })));

    renderBotLog(listening);
  }

  function renderBotLog(listening) {
    app.appendChild(section(t('botHeard')));
    if (!listening) return;
    var box = h('div', { class: 'log' });
    app.appendChild(box);
    function fill() {
      box.innerHTML = '';
      if (!state.botLog || !state.botLog.length) { box.appendChild(h('p', { class: 'logempty', text: t('botEmpty') })); return; }
      state.botLog.forEach(function (m) {
        var r = m.result || {};
        var out = h('div', { class: 'logout' },
          h('span', { class: m.applied ? 'ok' : 'skip', text: botResultText(m) }),
          h('span', { class: 'logtime', text: timeAgo(m.created_at || m.received_at || Date.now()) }));
        if (!m.applied && r.intent && m.user_id) {
          var known = state.families.some(function (f) { return f.groupme_user_id === m.user_id; });
          out.appendChild(h('div', { class: 'card-actions', style: 'margin-top:0.35rem' },
            !known ? h('button', { class: 'btn btn-sm btn-gold', text: t('addFamilyFrom'), onclick: function () { addFamilyFromGroupMe(m); } }) : null,
            h('button', { class: 'btn btn-sm', text: t('reread'), onclick: function () { rereadMessage(m); } })));
        }
        box.appendChild(h('div', { class: 'logrow' + (m.applied ? ' applied' : '') },
          h('div', { class: 'logmsg' }, h('b', { text: m.sender_name || '?' }), document.createTextNode(': ' + m.text)), out));
      });
    }
    if (state.botLog === null) loadBotLog().then(fill); else fill();
  }

  // Group display names look like "Folk-Maricela Orozco (Ashley Emily & Sharlene)".
  function guessFamily(display) {
    var d = String(display || '').replace(/^folk-?\s*/i, '').replace(/-\s*\S+\s+mom$/i, '');
    var m = d.match(/^(.*?)\s*\((.*)\)\s*$/);
    var who = m ? m[1].trim() : d.trim();
    var kids = [];
    if (m) {
      m[2].replace(/['’]s\s+mom|\bmom\b|\bdad\b|\badult\b/ig, '').split(/\s*(?:&|,|\/|\band\b|\by\b)\s*/).forEach(function (seg) {
        seg.trim().split(/\s+/).forEach(function (w) { if (w) kids.push(w); });   // names inside ( ) are first names
      });
    }
    var parts = who.split(/\s+/);
    var surname = parts.length > 1 ? parts[parts.length - 1] : '';
    if (!kids.length) return { name: surname || who, dancers: who };
    return { name: surname || who, dancers: kids.map(function (k) { return surname ? k + ' ' + surname : k; }).join(', ') };
  }
  function addFamilyFromGroupMe(m) {
    var g = guessFamily(m.sender_name);
    var name = h('input', { value: g.name, required: true });
    var dancers = h('input', { value: g.dancers });
    var form = h('form', { class: 'form-grid', onsubmit: function (e) {
      e.preventDefault();
      api('/api/families', { method: 'POST', body: { name: name.value, dancers: dancers.value, groupme_user_id: m.user_id } })
        .then(function () { toast(t('familyAdded')); closeModal(); return loadFamilies(); })
        .then(function () { return api('/api/groupme', { method: 'POST', body: { id: m.id } }); })
        .then(function () { return loadBotLog(); }).then(function () { return loadEvents(); }).then(render)
        .catch(function (x) { toast(x.message, true); });
    } },
      h('p', { class: 'hint', text: t('addFamilyHint', { name: m.sender_name }) }),
      field(t('newFamily'), name), field(t('dancers'), dancers, true),
      h('div', { class: 'full card-actions' }, h('button', { class: 'btn btn-gold', type: 'submit', text: t('addFamily') }), h('button', { class: 'btn', type: 'button', text: t('close'), onclick: closeModal })));
    modal(t('addFamilyFrom'), form);
  }
  function rereadMessage(m) {
    api('/api/groupme', { method: 'POST', body: { id: m.id } }).then(function (d) {
      toast(d.applied ? t('done') : botResultText({ result: d }));
      return loadBotLog().then(loadEvents).then(render);
    }).catch(function (e) { toast(e.message, true); });
  }

  /* ── render dispatch ───────────────────────────────────── */
  function render() {
    if (!state.me || state.me.role === 'anon') return renderLogin();
    /* #app is the scroller (team.css): a background repaint must not throw the list back to
       the top, but a tab change is a fresh view, so only the same tab keeps its place. */
    var scrollTop = app.scrollTop; var sameTab = painted === state.tab; painted = state.tab;
    if (state.me.role === 'admin') renderAdmin(); else renderMember();
    if (sameTab) { if (scrollTop) app.scrollTop = scrollTop; } else app.scrollTop = 0;
    if (state.me.role === 'admin') { if (state.detail) renderDetailSheet(); else if (document.querySelector('#modal-root .modal-detail')) closeModal(); }
  }
  function focusIfNeeded() {
    if (!state.focusEvent) return;
    var el = document.getElementById('event-' + state.focusEvent);
    state.focusEvent = null;
    if (el) { el.classList.add('is-flash'); setTimeout(function () { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50); }
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('/team/sw.js').catch(function () {}); });
  }

  boot();
})();
