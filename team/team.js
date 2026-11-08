/* Team availability app: owners (password) and families (invite link). */
(function () {
  'use strict';

  var app = document.getElementById('app');
  var FAMILIA = /^\/familia\/?$/.test(location.pathname);
  var ADMIN_SITE = /^\/admin\/?$/.test(location.pathname);
  if (ADMIN_SITE) {
    var amf = document.querySelector('link[rel="manifest"]'); if (amf) amf.href = '/team/admin.webmanifest';
    var aat = document.querySelector('meta[name="apple-mobile-web-app-title"]'); if (aat) aat.content = 'BFMH Admin';
    document.title = 'Admin · Ballet Folklórico Mi Herencia';
  }
  if (FAMILIA) {
    var mf = document.querySelector('link[rel="manifest"]'); if (mf) mf.href = '/team/familia.webmanifest';
    var at = document.querySelector('meta[name="apple-mobile-web-app-title"]'); if (at) at.content = 'MH Familia';
    document.title = 'Familia · Ballet Folklórico Mi Herencia';
  }
  var painted = null;
  var tabsEl = document.getElementById('tabs');
  var headerRight = document.getElementById('header-right');
  var fabRoot = document.getElementById('fab-root');
  var state = { me: null, events: [], families: [], roster: 0, botLog: null, tab: 'inbox', mtab: 'gigs', focusEvent: null, detail: null, gigLink: null, lang: 'en', loadedAt: 0, feedFresh: 0,
    inbox: loadInboxPrefs() };
  function loadInboxPrefs() {
    var d = { sort: 'newest', range: 'all', from: '', to: '', pick: false };
    try { var v = JSON.parse(localStorage.getItem('bfmh_team_inbox') || '{}'); if (v.sort === 'eventDate') d.sort = v.sort; if (['upcoming', 'tbd', 'past'].indexOf(v.range) >= 0) d.range = v.range; } catch (e) {}
    return d;
  }
  function saveInboxPrefs() { try { localStorage.setItem('bfmh_team_inbox', JSON.stringify({ sort: state.inbox.sort, range: state.inbox.range })); } catch (e) {} }

  /* ── i18n ───────────────────────────────────────────────── */
  var STR = {
    en: {
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      status: { inquiry: 'New inquiry', open: 'Open', confirmed: 'Confirmed', done: 'Done', declined: 'Declined', cancelled: 'Cancelled', lapsed: 'No reply' },
      types: { festival: 'Cultural Festival', quinceanera: 'Quinceañera', wedding: 'Wedding', private: 'Private Event', corporate: 'Corporate Event', school: 'School Assembly', classes: 'Classes', team: 'Group gathering', other: 'Other' },
      dateTbd: 'Date TBD', date: 'Date', tbd: 'TBD', performance: 'Performance', untitled: 'Untitled',
      callTime: 'Call time', dancersNeeded: '{n} dancers needed', pay: 'Pay', rehearsals: 'Rehearsals', whosIn: "Who's in",
      yes: 'yes', maybe: 'maybe', no: 'no', noAnswer: 'no answer',
      btnYes: '✓ Yes', btnMaybe: '? Maybe', btnNo: '✗ No', availabilityFor: 'Availability for {name}',
      signOut: 'Sign out', familia: 'Familia', owner: 'Ramirez family', whoOwner: 'Mayra or Angel', newGig: '+ New gig',
      loginTitle: 'Team sign-in', loginText: 'Enter your password to manage events.',
      ownerPassword: 'Team password', signIn: 'Sign in', notConfigured: 'ADMIN_PASSWORD is not set on the server yet.',
      signInAs: 'Your name',
      badLink: 'That link is not valid anymore. Ask Mayra or Angel for a new one.',
      needsAnswer: 'Needs your answer', upcoming: 'Upcoming', recent: 'Past gigs', myFamily: 'My family',
      subscribe: 'Add our gigs to your calendar', subscribeHint: 'Keeps updating on its own as dates change.',
      subscribeOwner: 'Add every gig to your calendar', addToCal: 'Add to my calendar', calSection: 'Your phone’s calendar',
      subscribeWhat: 'Every gig posted to the team lands in your calendar until you turn it down — the ones your family answers no to drop off on their own. It keeps updating as dates and details change.',
      subscribeWhatOwner: 'Every gig on the board. It keeps updating on its own.',
      addToCalHint: 'Saves the call time, the address, and a reminder the day before.',
      removeFromCal: 'Remove from my calendar', removeFromCalHint: 'This gig was cancelled — take it off your calendar.',
      removeEventHint: 'Apple opens a cancellation for the gig and its rehearsals — tap Delete. Google and Outlook open that day so you can delete it there. If you subscribed to the feed, it drops off on its own.',
      addEventHint: 'Saves the call time and the address.',
      subscribePick: 'Which calendar do you use?', calApple: 'Apple Calendar / iPhone', calGoogle: 'Google Calendar',
      calOutlook: 'Outlook', calCopy: 'Copy the link instead',
      calRehearsalNote: 'Rehearsals come along only with Apple Calendar. Subscribe above to get them everywhere.',
      calGoogleNote: 'Google checks for changes once a day or so, Apple and Outlook every few hours. If a date just moved, open the gig and add it again to get it right away.',
      addDancersFirst: 'Add the dancers in your family below so you can mark availability for each of them.',
      allAnswered: 'Everything else is answered. ¡Gracias!', noGigs: 'No gigs posted yet. Mayra and Angel will post here when an inquiry comes in.',
      answerCleared: 'Answer cleared', dancers: 'Dancers', addDancerPh: 'Add a dancer (e.g. Sofia)', dancerName: 'Dancer name', add: 'Add',
      removeDancer: 'Remove {name} from your family?', remove: 'Remove', phone: 'Phone',
      saved: 'Saved', copied: 'Copied', copyFail: 'Could not copy',
      tabInbox: 'Inbox', tabGigs: 'Calendar', tabFeed: 'Feed', tabTeam: 'Team', tabChona: 'La Chona', tabInsights: 'Insights', roleAdmin: 'Admin',
      adminLoginTitle: 'Admin sign-in', adminLoginText: 'Your admin password opens everything Mayra and Angel see, plus Insights.',
      groupmeOn: 'La Chona is connected', groupmeOff: 'La Chona is not connected — set GROUPME_BOT_ID',
      newInquiries: 'New inquiries', inboxSub: 'Every message from the website contact and quote forms lands here automatically.', inboxClear: 'Inbox is clear.',
      sortBy: 'Sort', sortNewest: 'Newest first', sortEventDate: 'By event date', showLabel: 'Show', filterAll: 'All', filterUpcoming: 'Upcoming', filterTbd: 'Date TBD', filterPast: 'Past',
      filterDates: 'Pick dates', filterFrom: 'From', filterTo: 'To', clearFilters: 'Clear filters', noMatch: 'No inquiries match these filters.', ofTotal: '{n} of {total}',
      archived: 'Didn’t happen', archivedHint: 'Declined, cancelled, or the client never got back to us. Inquiries move here on their own two weeks after their date passes.', posted: 'Posted to the team',
      nothingPosted: 'Nothing posted yet. Post an inquiry from the Inbox, or create a new gig.', past: 'Past',
      from: 'From', email: 'Email', type: 'Type', received: 'Received', via: 'via',
      askGroup: '📢 Ask GroupMe who’s available', postTally: 'Post tally to GroupMe',
      askedNever: 'Not asked in GroupMe yet', askedToast: 'Asked in GroupMe — RSVPs will fill in the roster', askNeedsDate: 'Set the event date first — replies are matched by date',
      justNow: 'just now', minsAgo: '{n} min ago', hoursAgo: '{n} h ago', daysAgo: '{n} d ago',
      postToTeam: 'Post to team', addQuietly: 'Add to the calendar without posting', addQuietlyNew: 'Add straight to the calendar — no GroupMe post', confirmPost: 'Post the confirmation to GroupMe', edit: 'Edit', decline: 'Decline', lapse: 'No reply — didn’t happen', reopen: 'Reopen as inquiry', del: 'Delete',
      mergeIntoGig: 'This became a gig…', mergePick: 'Which gig did this inquiry become?', mergeSub: 'Its contact info and message move onto the gig.',
      mergeNone: 'No gigs to merge into yet.', sameDay: 'same day', mergeGo: 'Merge',
      mergeConfirm: 'Merge “{inq}” into “{gig}”? The client’s contact info and message move onto the gig, and the inquiry leaves the inbox.',
      mergeDone: 'Merged into {gig}', sameDayHint: 'Same day as {gig}. The same job?',
      deleteConfirm: 'Delete “{title}” permanently?', thisEvent: 'this event', done: 'Done', donePosted: 'Done — posted to {ch}', groupme: 'GroupMe',
      requiredTag: 'required', optionalHead: 'Optional — fill in what you know',
      payLabel: 'Pay (Mayra & Angel only)', payPh: '$50 per dancer',
      title: 'Title', titlePh: 'e.g. Quinceañera — Lopez family', typeLabel: 'Type', typePh: '— type —', dateLabel: 'Date', startTime: 'Start time', endTime: 'End time',
      dancersNeededLabel: 'Dancers needed', venue: 'Venue', city: 'City', address: 'Address',
      clientWrote: 'Client wrote (date & city)', clientWroteShort: 'Client wrote', detailsForTeam: 'Details for the team', detailsPh: 'Costume, dances, parking, what to bring…',
      rehearsalsLabel: 'Rehearsals (shown to the team)', rehearsalDate: 'Rehearsal date', time: 'Time', locationNote: 'Location / note', addRehearsal: '+ Add rehearsal',
      clientSection: 'Client contact & private notes', clientName: 'Client name', clientEmail: 'Client email', clientPhone: 'Client phone', clientMessage: 'Client message',
      privateNotes: 'Private notes (Mayra & Angel only)',
      needTitle: 'Give the gig a title.', create: 'Create', save: 'Save', cancel: 'Cancel', close: 'Close',
      modalNew: 'New gig', modalEdit: 'Edit gig',
      tapToChange: 'Tap to change',
      editDetails: 'Edit details', postAnnouncement: 'Post the announcement', sendReminder: 'Send reminder', confirmGig: 'Confirm gig',
      confirmAsk: 'Confirm this gig? Families who said yes will be notified (if a channel is connected).', cancelGig: 'Cancel gig', cancelAsk: 'Cancel this gig?',
      cancelPost: 'Have La Chona post “Gig cancelled” to GroupMe', postCancellation: 'Post the cancellation',
      postConfirmation: 'Post the confirmation', markDone: 'Mark done', gig: 'Gig',
      botEmpty: 'No messages read yet.', botIgnored: 'Ignored', botNoDancers: 'Could not tell which dancer', botUnknownSender: 'Unknown sender — no dancer named', botNoEvent: 'No open gig to apply it to', botGuessed: '(assumed latest gig)', botGuessedTag: 'Guessed the latest gig', chgToday: 'Today', chgYesterday: 'Yesterday', botLinked: 'GroupMe linked', botAmbiguous: 'Ambiguous name: {names}', botNoDate: 'No gig on that date', botVague: 'Long message with no date — not applied', botAnnouncement: 'Announcement / reminder — not an answer', botPaused: 'Sent by a paused dancer — not applied', botKept: 'Kept the answers already there (newer, or the dancer’s own)',
      addFamilyFrom: 'Add this family', reread: 'Read again', addFamilyHint: 'From GroupMe name “{name}”. Check the spelling of each dancer — the bot matches these names in the chat.',
      pickWho: 'Who’s answering?', pickHint: 'Tap your family. We’ll remember you on this phone.', pickNotListed: 'Don’t see your family? Just reply in GroupMe and Mayra or Angel will add you.',
      pickClosed: 'This gig isn’t taking answers right now.', pickBadLink: 'That link is no longer valid. Ask Mayra or Angel for a new one.',
      chonaAlt: 'La Chona, a little gold robot in a red and green folklorico dress with braided ribbons',
      chonaOn: 'Listening to the chat', chonaOff: 'Not listening yet',
      chonaLive: 'Connected · listening to the chat', chonaPostOnly: 'Connected · not listening yet',
      chonaListenOnly: 'Listening · can’t post yet', chonaDown: 'Not connected',
      botSubOff: 'Not listening yet. Set GROUPME_WEBHOOK_SECRET on the server and point the bot’s callback URL at /api/webhooks/groupme?secret=… (see README).',
      postFailed: 'GroupMe did not take the message — try again',
      guideWho: 'La Chona sits in the GroupMe chat, reads what the families write, and marks the roster for you — so nobody counts yeses by hand at midnight.',
      guideSteps: 'What she does',
      guideStep1: 'You tap **Ask GroupMe** on a gig. She posts the date, the place, and the link to RSVP — you never copy or paste anything.',
      guideStep2: 'Families RSVP by tapping her link. If someone types an answer in the chat anyway, she still marks it.',
      guideStep3: 'She never replies in the chat, so nobody’s phone buzzes for it. Her activity below shows everything she marked.',
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
      websiteRowOn: 'Listed on bfmh.dance', websiteRowOff: 'Not on bfmh.dance', websiteRowHint: 'Public gigs show under Upcoming Events and in Google search results.',
      familiesTitle: 'Families & dancers', familiesSub: 'Send a family their link and they can answer every open gig request in one place. Totally optional — La Chona already does something similar.',
      familyNamePh: 'Family name (e.g. Garcia)', dancersPh: 'Dancers, comma separated (e.g. Luis, Elena)',
      newFamily: 'New family', addFamily: 'Add family', familyAdded: 'Family added', noFamilies: 'No families yet.',
      removeAsk: 'Remove {name}?', addDancer: 'Add dancer', copyInvite: 'Copy link to their upcoming gigs', newLink: 'New link',
      newLinkAsk: 'Create a new link for {name}? The old one will stop working.', removeFamily: 'Remove family', removeFamilyAsk: 'Remove the {name} family and their dancers?',
      editFamily: 'Edit family', familyNameLabel: 'Family name', familySaved: 'Family updated', needFamilyName: 'Give the family a name.',
      needDancerName: 'Give every dancer a name, or remove the empty row.',
      dancerRowName: 'Dancer name', pauseDancer: 'Pause', resumeDancer: 'Un-pause', pausedTag: 'paused',
      pauseHint: 'A paused dancer stays in the family but stops showing up on gigs. Removing deletes their answers too.',
      addAnotherDancer: '+ Add dancer', undoRemove: 'Undo',
      groupmeLabel: 'GroupMe account', groupmeNone: '— not linked —', groupmeOther: 'Linked (id {id})',
      groupmeHint: 'La Chona reads this family’s chat replies as theirs. Pick the name they post under, or leave it unlinked.',
      ownGroupme: 'Own GroupMe', ownGroupmeNone: '— family answers —', ownGroupmeTag: 'answers for themselves in GroupMe',
      ownGroupmeHint: 'Grown dancers with their own GroupMe: La Chona reads their replies as theirs alone, and a parent’s “we can’t” won’t overwrite an answer they gave themselves. Naming them (“Isaias yes”) still counts.',
      groupmeTwice: 'Each GroupMe account can belong to only one person here.',
      roleTeam: 'Team', stateNone: 'Not answered', stateYes: 'Going', stateMaybe: 'Maybe', stateNo: 'Not going',
      waiting: 'no response received', plusWaiting: '+{n} with no response', everyoneAnswered: 'everyone answered', rosterSettled: 'Roster settled',
      neverAsked: 'Never asked', askedAgo: 'Asked {when}', rehearsalsShort: 'Rehearsals',
      inboxEmptyText: 'Nothing new from the website. Inquiries from the contact and quote forms show up here on their own.',
      inboxEmptyBtn: 'Create a gig by hand', noGigsFamilyText: 'No gigs posted yet. When Mayra and Angel post one you’ll hear about it in GroupMe.',
      checkMyDancers: 'Check my dancers', allAnsweredText: 'Everything is answered. ¡Gracias! We’ll let you know when the next one is posted.',
      families: 'Families', addAFamily: 'Add a family', botHeard: 'What La Chona heard', botLinkedChip: 'Bot linked', notLinked: 'Not linked',
      openGig: 'Open gig', addRehearsalShort: 'Add rehearsal',
      going: 'going', ofNeeded: 'of {n} needed', moreNeeded: '{n} more needed', full: 'Roster is full', noneYet: 'No answers yet',
      moreActions: 'More', setAnswerFor: 'Answer for {name}', clearAnswer: 'Clear answer',
      waitingOn: 'No response received', tapGigHint: 'Tap a gig to see who’s in and nudge who isn’t.',
      goingAre: 'Going:',
      everyone: 'Everyone in the family', allYes: 'All yes', allNo: 'All no',
      shareInvite: 'Send link', inviteMsg: 'Your family’s link for Ballet Folklórico Mi Herencia gigs — tap it to mark who can dance:',
      refresh: 'Refresh', tryAgain: 'Try again', refreshed: 'Up to date', answered: 'answered', answeredLine: '{n} of {total} answered', tapName: 'Tap a name to answer for them.',
      when: 'When', where: 'Where', needs: 'Needs', client: 'Client', call: 'Call', text: 'Text',
      chatOn: 'La Chona is in the chat', chatOff: 'La Chona is not connected',
      printSchedule: 'Print roster', printShort: 'Print',
      printPick: 'Gigs to include', printAll: 'Select all', printNone: 'Clear', printCount: '{n} selected',
      printOpen: 'Open roster', printShare: 'Share', printCopy: 'Copy link',
      printHint: 'Open it, then tap Print or save as PDF.',
      printShareMsg: 'Gig roster',
      tabMedia: 'Gallery', gallery: 'Photos & videos', galleryN: 'Photos & videos ({n})', mediaLoading: 'Loading the gallery…',
      storageOff: 'Photo and music storage isn’t set up yet — Mayra and Angel need to connect it.', storageLabel: 'Storage', storageUsed: '{used} of {quota} free space used',
      dances: 'Dances', dancesHint: 'Every video of a dance, from all our gigs.', danceVideos: 'Videos of this dance', sortMostDone: 'Most performed', sortAz: 'A–Z', region: 'Region', allRegions: 'All', otherRegion: 'Other', danceGigsN: 'Performed at {n} gigs', danceVideosN: '{n} videos', noDanceVideos: 'No videos of this dance yet.',
      musicLibrary: 'Music library', addSongs: 'Add songs', noSongs: 'No songs yet. Add the music for each dance so everyone can practice.',
      gigGalleries: 'Gig & event galleries', noGalleryGigs: 'No gigs yet.',
      newFolder: 'New folder', folderHint: 'For photos and videos from group events that aren’t gigs — a posada, a trip, a practice. It won’t show in the Calendar tab or anyone’s calendar.',
      folderTitlePh: 'e.g. Christmas posada 2026', folderDateHint: 'Leave the date empty for folders that span many days.', editFolder: 'Edit folder', deleteFolder: 'Delete folder',
      deleteFolderAsk: 'Delete this folder and everything in it for everyone? It can’t be undone.', folderMenu: 'Folder options', deleteGatheringAsk: 'Delete “{title}” and all its photos and videos for everyone? It also comes off the calendar. It can’t be undone.', nothingYet: 'Nothing yet — be the first to add something',
      photoOne: '1 photo', photoMany: '{n} photos', videoOne: '1 video', videoMany: '{n} videos',
      feedSub: 'Gig news, plus the photos, videos and music the group has shared', blastNew: 'New gig: are you available?', blastAsk: 'Reminder: mark who can dance', blastConfirmed: 'Gig confirmed', blastCancelled: 'Gig cancelled', blastGathering: 'New group event', blastGatheringAsk: 'Reminder: RSVP for the group event', feedAdded: 'added {what}', feedAnd: ' and ',
      feedNew: 'New', feedMore: 'more', feedOlder: 'Show older', feedEmpty: 'Nothing added yet.', songOne: '1 song', songMany: '{n} songs',
      rename: 'Rename', untitledSong: 'Untitled song', addedBy: 'Added by {who}', theOwners: 'the Ramirez family', theFamily: 'the {name} family',
      youTitle: 'You', youSub: 'Photos, videos and links you add show under this family instead of “the Ramirez family”. You keep every tool.',
      youFamily: 'Your family', youNone: 'None — show as “the Ramirez family”', youSaved: 'Saved', titleLabel: 'Title',
      deleteMediaAsk: 'Delete this for everyone? It can’t be undone.', deleted: 'Deleted',
      photos: 'Photos', videos: 'Videos', addMedia: 'Photos & videos', noMedia: 'No photos or videos yet. Add the ones you took at this gig.',
      openPhoto: 'Open photo {n}', openVideo: 'Play video {n}', previous: 'Previous', next: 'Next',
      addLink: 'Add YouTube link', openYoutube: 'Open in YouTube', linkKind: 'Link', cover: 'Cover', coverTitle: 'Folder cover', coverHint: 'Pick the picture everyone sees on this gig’s folder.', coverAuto: 'Choose automatically', coverSet: 'Cover updated', addLinkShort: 'YouTube', video: 'Video',
      videoHint: 'Photos and clips up to 150 MB upload here. For full performances, add an Unlisted YouTube link.',
      linkHint: 'Anyone with the bfmh.dance/familia address can see this gallery. Set YouTube videos to Unlisted so they stay off search.', linkUrl: 'Link',
      uploadingN: 'Uploading {n} of {total}…', uploadFailed: '{n} didn’t upload.', uploadedOne: 'Uploaded', uploadedMany: '{n} uploaded',
      uploadRefused: 'storage refused it ({n})', uploadNetwork: 'the connection dropped',
      familiesLoading: 'Loading families…', dirTitle: 'Which family are you part of?', dirHint: 'Tap your family to see our gigs, photos, videos and music. This phone will remember you — add this page to your home screen to come back anytime.',
      dirEmpty: 'No families have been added yet.', ownersHere: 'Admins can sign in here', familiesHere: 'Families: find your family here',
      webShow: 'Show on bfmh.dance', webHide: 'Remove from bfmh.dance', webBadge: 'On bfmh.dance',
      webOn: 'Now on bfmh.dance — it shows up within a few minutes', webOff: 'Removed from bfmh.dance',
      webSuggest: 'Suggest for bfmh.dance', webWithdraw: 'Withdraw suggestion', webApprove: 'Approve for bfmh.dance', webPending: 'Waiting for Mayra or Angel’s OK',
      lbShow: 'Show on site', lbHide: 'Hide from site', lbSuggest: 'Suggest for site', lbWithdraw: 'Withdraw',
      webSuggested: 'Suggested — Mayra or Angel will look at it before it goes on bfmh.dance',
      reviewTitle: 'Waiting for your OK', reviewHint: 'Families suggested these for bfmh.dance. Nothing goes public until you approve it.',
      approve: 'Approve', webDeclined: 'Kept off bfmh.dance',
      printNoGigs: 'Post a gig first, then print the roster.', printMax: 'Up to 10 gigs fit on one page — uncheck some to continue.',
      undoTitle: 'Undo La Chona’s changes from this message?', undoConfirm: 'Undo', undoDone: 'Restored {n}',
      undoSkipped: '{n} kept: changed since', undoDeleted: '{n} skipped: dancer removed', undoneTag: 'Undone',
      undoAlready: 'Already undone', undoNotFound: 'Message not found', undoFailed: 'Could not undo — try again',
      logChanges: 'Changes she made', logAttention: 'Needs a look', logAll: 'Everything', logNone: 'Nothing here yet', logShowMore: 'Show more', guideFold: 'How La Chona works',
      changesTitle: 'Recent changes', changesMore: 'Show all', changesEmpty: 'No changes yet', changesLoading: 'Loading…',
      changesGigEdited: '{who} edited {fields}', changesGigCreated: '{who} created this gig', changesGigDeleted: '{who} deleted this gig',
      whoBot: 'La Chona ({sender})', whoUndo: 'undo', whoSystem: 'system',
      gkinds: { potluck: 'Potluck', posada: 'Posada', party: 'Party', practice: 'Practice', meeting: 'Meeting', outing: 'Outing', fundraiser: 'Fundraiser', other: 'Get-together' },
      groupEvents: 'Group events', groupEventsSub: 'Potlucks, posadas and get-togethers. Just for us, never on bfmh.dance. Post one to GroupMe so families RSVP, and share the invite with anyone you like.',
      announceEvent: 'Post to GroupMe', remindEvent: 'Remind in GroupMe', eventPosted: 'Posted to GroupMe — it’s in the Feed too', potluckNotes: 'Potluck suggestions', potluckNotesPh: 'e.g. College kids bring dessert, families with little ones bring drinks…',
      newEvent: 'New group event', newWhat: 'What are you adding?', addGig: 'A gig', addGigSub: 'A performance. Families mark who can dance.',
      addEvent: 'A group event', addEventSub: 'A potluck, posada or get-together, with RSVPs and an invite anyone can open.',
      eventKind: 'Kind of event', eventTitlePh: 'e.g. Christmas posada', eventWhere: 'Where', eventWherePh: 'e.g. The Ramirez home',
      eventDetails: 'Description', eventDetailsPh: 'What it is, parking, what to wear, bring a chair…', potluckToggle: 'Potluck sign-up: guests pick what to bring',
      needEventDate: 'Give the event a date.', modalNewEvent: 'New group event', modalEditEvent: 'Edit group event',
      eventGoing: '{n} going', eventRsvp: 'RSVP', youGoingShort: 'You’re going', youMaybeShort: 'Maybe', youNoShort: 'Not going', potluckShort: 'Potluck {c}/{n}',
      noEvents: 'No group events coming up.', pastEvents: 'Past group events', loadingEvent: 'Loading the event…',
      shareEvent: 'Share invite', copyEventLink: 'Copy invite link', editEvent: 'Edit event', deleteEvent: 'Delete event', eventMenu: 'Event options',
      deleteEventAsk: 'Delete “{title}”? Its RSVPs, potluck list, photos and videos go too, for everyone. It can’t be undone.',
      addFlyer: 'Add a flyer', changeFlyer: 'Change the flyer', removeFlyer: 'Remove the flyer', removeFlyerAsk: 'Take the flyer off “{title}”?',
      flyerUploading: 'Uploading the flyer…', flyerSaved: 'Flyer added', flyerRemoved: 'Flyer removed', flyerNotImage: 'Pick a photo or image of the flyer',
      eventShareMsg: 'You’re invited to {title}! RSVP here:', galAll: 'All', galGigs: 'Gigs', galEvents: 'Events', galEventTag: 'Event', noGalleryMatch: 'Nothing here yet.',
    },
    es: {
      months: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
      days: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
      status: { inquiry: 'Nueva solicitud', open: 'Abierto', confirmed: 'Confirmado', done: 'Terminado', declined: 'Rechazado', cancelled: 'Cancelado', lapsed: 'Sin respuesta' },
      types: { festival: 'Festival cultural', quinceanera: 'Quinceañera', wedding: 'Boda', private: 'Evento privado', corporate: 'Evento corporativo', school: 'Asamblea escolar', classes: 'Clases', team: 'Convivio del grupo', other: 'Otro' },
      dateTbd: 'Fecha por confirmar', date: 'Fecha', tbd: '¿?', performance: 'Presentación', untitled: 'Sin título',
      callTime: 'Hora de llegada', dancersNeeded: 'Se necesitan {n} bailarines', pay: 'Pago', rehearsals: 'Ensayos', whosIn: 'Quién va',
      yes: 'sí', maybe: 'tal vez', no: 'no', noAnswer: 'sin respuesta',
      btnYes: '✓ Sí', btnMaybe: '? Tal vez', btnNo: '✗ No', availabilityFor: 'Disponibilidad de {name}',
      signOut: 'Salir', familia: 'Familia', owner: 'Familia Ramirez', whoOwner: 'Mayra o Angel', newGig: '+ Nuevo evento',
      loginTitle: 'Acceso del equipo', loginText: 'Escribe tu contraseña para administrar eventos.',
      ownerPassword: 'Contraseña del equipo', signIn: 'Entrar', notConfigured: 'ADMIN_PASSWORD todavía no está configurado en el servidor.',
      signInAs: 'Tu nombre',
      badLink: 'Ese enlace ya no es válido. Pide uno nuevo a Mayra o Angel.',
      needsAnswer: 'Falta tu respuesta', upcoming: 'Próximos', recent: 'Eventos pasados', myFamily: 'Mi familia',
      subscribe: 'Agrega nuestros eventos a tu calendario', subscribeHint: 'Se actualiza solo cuando cambian las fechas.',
      subscribeOwner: 'Agrega todos los eventos a tu calendario', addToCal: 'Agregar a mi calendario', calSection: 'Calendario de tu celular',
      subscribeWhat: 'Cada evento publicado al equipo aparece en tu calendario hasta que lo rechazas — los que tu familia contesta que no desaparecen solos. Se actualiza cuando cambian las fechas y los detalles.',
      subscribeWhatOwner: 'Todos los eventos del tablero. Se actualiza solo.',
      addToCalHint: 'Guarda la hora de llegada, la dirección y un recordatorio el día anterior.',
      removeFromCal: 'Quitar de mi calendario', removeFromCalHint: 'Este evento se canceló — quítalo de tu calendario.',
      removeEventHint: 'Apple abre la cancelación del evento y sus ensayos — toca Eliminar. Google y Outlook abren ese día para que lo borres ahí. Si te suscribiste al calendario, desaparece solo.',
      addEventHint: 'Guarda la hora de llegada y la dirección.',
      subscribePick: '¿Qué calendario usas?', calApple: 'Apple Calendar / iPhone', calGoogle: 'Google Calendar',
      calOutlook: 'Outlook', calCopy: 'Mejor copiar el enlace',
      calRehearsalNote: 'Los ensayos solo se incluyen con Apple Calendar. Suscríbete arriba para tenerlos en cualquier calendario.',
      calGoogleNote: 'Google busca cambios una vez al día; Apple y Outlook cada pocas horas. Si una fecha acaba de cambiar, abre el evento y agrégalo de nuevo para tenerlo al instante.',
      addDancersFirst: 'Agrega abajo a los bailarines de tu familia para marcar la disponibilidad de cada uno.',
      allAnswered: 'Todo lo demás ya está respondido. ¡Gracias!', noGigs: 'Aún no hay eventos publicados. Mayra y Angel publicarán aquí cuando llegue una solicitud.',
      answerCleared: 'Respuesta borrada', dancers: 'Bailarines', addDancerPh: 'Agregar bailarín (p. ej. Sofía)', dancerName: 'Nombre del bailarín', add: 'Agregar',
      removeDancer: '¿Quitar a {name} de tu familia?', remove: 'Quitar', phone: 'Teléfono',
      saved: 'Guardado', copied: 'Copiado', copyFail: 'No se pudo copiar',
      tabInbox: 'Solicitudes', tabGigs: 'Calendario', tabFeed: 'Actividad', tabTeam: 'Equipo', tabChona: 'La Chona', tabInsights: 'Datos', roleAdmin: 'Admin',
      adminLoginTitle: 'Acceso de administración', adminLoginText: 'Tu contraseña de admin abre todo lo que ven Mayra y Angel, más Datos.',
      groupmeOn: 'La Chona está conectada', groupmeOff: 'La Chona no está conectada — falta GROUPME_BOT_ID',
      newInquiries: 'Nuevas solicitudes', inboxSub: 'Cada mensaje del formulario de contacto y de cotización del sitio llega aquí automáticamente.', inboxClear: 'No hay solicitudes pendientes.',
      sortBy: 'Ordenar', sortNewest: 'Más recientes', sortEventDate: 'Por fecha del evento', showLabel: 'Mostrar', filterAll: 'Todas', filterUpcoming: 'Próximas', filterTbd: 'Sin fecha', filterPast: 'Pasadas',
      filterDates: 'Elegir fechas', filterFrom: 'Desde', filterTo: 'Hasta', clearFilters: 'Quitar filtros', noMatch: 'Ninguna solicitud coincide con estos filtros.', ofTotal: '{n} de {total}',
      archived: 'No se hicieron', archivedHint: 'Rechazados, cancelados o el cliente nunca respondió. Las solicitudes pasan aquí solas dos semanas después de su fecha.', posted: 'Publicados al equipo',
      nothingPosted: 'Nada publicado todavía. Publica una solicitud desde Solicitudes o crea un evento nuevo.', past: 'Pasados',
      from: 'De', email: 'Correo', type: 'Tipo', received: 'Recibido', via: 'vía',
      askGroup: '📢 Preguntar en GroupMe quién puede', postTally: 'Publicar el conteo en GroupMe',
      askedNever: 'Aún no se ha preguntado en GroupMe', askedToast: 'Preguntado en GroupMe — las confirmaciones llenarán la lista', askNeedsDate: 'Primero pon la fecha del evento — las respuestas se identifican por fecha',
      justNow: 'ahora mismo', minsAgo: 'hace {n} min', hoursAgo: 'hace {n} h', daysAgo: 'hace {n} d',
      postToTeam: 'Publicar al equipo', addQuietly: 'Agregar al calendario sin publicar', addQuietlyNew: 'Agregar directo al calendario — sin publicar en GroupMe', confirmPost: 'Publicar la confirmación en GroupMe', edit: 'Editar', decline: 'Rechazar', lapse: 'Sin respuesta — no se hizo', reopen: 'Reabrir como solicitud', del: 'Eliminar',
      mergeIntoGig: 'Esto se volvió un evento…', mergePick: '¿En qué evento se convirtió esta solicitud?', mergeSub: 'Sus datos de contacto y su mensaje pasan al evento.',
      mergeNone: 'Todavía no hay eventos para unir.', sameDay: 'mismo día', mergeGo: 'Unir',
      mergeConfirm: '¿Unir “{inq}” con “{gig}”? Los datos de contacto y el mensaje del cliente pasan al evento, y la solicitud sale de la bandeja.',
      mergeDone: 'Unido con {gig}', sameDayHint: 'Mismo día que {gig}. ¿Es el mismo trabajo?',
      deleteConfirm: '¿Eliminar “{title}” permanentemente?', thisEvent: 'este evento', done: 'Listo', donePosted: 'Listo — publicado en {ch}', groupme: 'GroupMe',
      requiredTag: 'obligatorio', optionalHead: 'Opcional — llena lo que sepas',
      payLabel: 'Pago (solo Mayra y Angel)', payPh: '$50 por bailarín',
      title: 'Título', titlePh: 'p. ej. Quinceañera — familia López', typeLabel: 'Tipo', typePh: '— tipo —', dateLabel: 'Fecha', startTime: 'Hora de inicio', endTime: 'Hora de fin',
      dancersNeededLabel: 'Bailarines necesarios', venue: 'Lugar', city: 'Ciudad', address: 'Dirección',
      clientWrote: 'El cliente escribió (fecha y ciudad)', clientWroteShort: 'El cliente escribió', detailsForTeam: 'Detalles para el equipo', detailsPh: 'Vestuario, bailes, estacionamiento, qué traer…',
      rehearsalsLabel: 'Ensayos (visibles al equipo)', rehearsalDate: 'Fecha del ensayo', time: 'Hora', locationNote: 'Lugar / nota', addRehearsal: '+ Agregar ensayo',
      clientSection: 'Contacto del cliente y notas privadas', clientName: 'Nombre del cliente', clientEmail: 'Correo del cliente', clientPhone: 'Teléfono del cliente', clientMessage: 'Mensaje del cliente',
      privateNotes: 'Notas privadas (solo Mayra y Angel)',
      needTitle: 'Ponle un título al evento.', create: 'Crear', save: 'Guardar', cancel: 'Cancelar', close: 'Cerrar',
      modalNew: 'Nuevo evento', modalEdit: 'Editar evento',
      tapToChange: 'Toca para cambiar',
      editDetails: 'Editar detalles', postAnnouncement: 'Publicar el anuncio', sendReminder: 'Enviar recordatorio', confirmGig: 'Confirmar evento',
      confirmAsk: '¿Confirmar este evento? Se avisará a las familias que dijeron que sí (si hay un canal conectado).', cancelGig: 'Cancelar evento', cancelAsk: '¿Cancelar este evento?',
      cancelPost: 'Que La Chona publique “Evento cancelado” en GroupMe', postCancellation: 'Publicar la cancelación',
      postConfirmation: 'Publicar la confirmación', markDone: 'Marcar terminado', gig: 'Evento',
      botEmpty: 'Aún no ha leído mensajes.', botIgnored: 'Ignorado', botNoDancers: 'No supo de qué bailarín se trata', botUnknownSender: 'Remitente desconocido — no nombró a ningún bailarín', botNoEvent: 'No hay evento abierto', botGuessed: '(asumió el evento más reciente)', botGuessedTag: 'Supuso el evento más reciente', chgToday: 'Hoy', chgYesterday: 'Ayer', botLinked: 'GroupMe vinculado', botAmbiguous: 'Nombre ambiguo: {names}', botNoDate: 'No hay evento en esa fecha', botVague: 'Mensaje largo sin fecha — no se aplicó', botAnnouncement: 'Aviso / recordatorio — no es respuesta', botPaused: 'Lo envió un bailarín en pausa — no se aplicó', botKept: 'Se quedaron las respuestas que ya había (más nuevas, o del propio bailarín)',
      addFamilyFrom: 'Agregar esta familia', reread: 'Leer de nuevo', addFamilyHint: 'Del nombre de GroupMe “{name}”. Revisa cómo se escribe cada bailarín — el bot busca esos nombres en el chat.',
      pickWho: '¿Quién responde?', pickHint: 'Toca tu familia. Te recordaremos en este teléfono.', pickNotListed: '¿No ves a tu familia? Responde en GroupMe y Mayra o Angel te agregan.',
      pickClosed: 'Este evento no está recibiendo respuestas.', pickBadLink: 'Ese enlace ya no es válido. Pide uno nuevo a Mayra o Angel.',
      chonaAlt: 'La Chona, una robotita dorada con vestido folclórico rojo y verde y trenzas con listones',
      chonaOn: 'Escuchando el chat', chonaOff: 'Todavía no escucha',
      chonaLive: 'Conectada · escuchando el chat', chonaPostOnly: 'Conectada · todavía no escucha',
      chonaListenOnly: 'Escuchando · no puede publicar', chonaDown: 'No conectada',
      botSubOff: 'Todavía no escucha. Configura GROUPME_WEBHOOK_SECRET en el servidor y apunta la URL de callback del bot a /api/webhooks/groupme?secret=… (ver README).',
      postFailed: 'GroupMe no aceptó el mensaje — inténtalo de nuevo',
      guideWho: 'La Chona está en el chat de GroupMe, lee lo que escriben las familias y marca la lista por ti — para que nadie ande contando los “sí” a medianoche.',
      guideSteps: 'Qué hace',
      guideStep1: 'Tocas **Preguntar en GroupMe** en un evento. Ella publica la fecha, el lugar y el enlace para confirmar — tú no copias ni pegas nada.',
      guideStep2: 'Las familias confirman tocando su enlace. Si alguien escribe su respuesta en el chat, igual la marca.',
      guideStep3: 'Nunca responde en el chat, así que a nadie le suena el teléfono por eso. Su actividad abajo muestra todo lo que marcó.',
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
      websiteRowOn: 'Aparece en bfmh.dance', websiteRowOff: 'No aparece en bfmh.dance', websiteRowHint: 'Los eventos públicos aparecen en Próximos Eventos y en los resultados de Google.',
      familiesTitle: 'Familias y bailarines', familiesSub: 'Envía a una familia su enlace y podrán responder a todos los eventos abiertos en un solo lugar. Es totalmente opcional — La Chona ya hace algo parecido.',
      familyNamePh: 'Apellido de la familia (p. ej. García)', dancersPh: 'Bailarines separados por comas (p. ej. Luis, Elena)',
      newFamily: 'Nueva familia', addFamily: 'Agregar familia', familyAdded: 'Familia agregada', noFamilies: 'Todavía no hay familias.',
      removeAsk: '¿Quitar a {name}?', addDancer: 'Agregar bailarín', copyInvite: 'Copiar enlace a sus próximos eventos', newLink: 'Nuevo enlace',
      newLinkAsk: '¿Crear un nuevo enlace para {name}? El anterior dejará de funcionar.', removeFamily: 'Quitar familia', removeFamilyAsk: '¿Quitar a la familia {name} y a sus bailarines?',
      editFamily: 'Editar familia', familyNameLabel: 'Apellido de la familia', familySaved: 'Familia actualizada', needFamilyName: 'Ponle nombre a la familia.',
      needDancerName: 'Ponle nombre a cada bailarín, o quita la fila vacía.',
      dancerRowName: 'Nombre del bailarín', pauseDancer: 'Pausar', resumeDancer: 'Reactivar', pausedTag: 'en pausa',
      pauseHint: 'Un bailarín en pausa sigue en la familia, pero ya no aparece en los eventos. Quitarlo borra también sus respuestas.',
      addAnotherDancer: '+ Agregar bailarín', undoRemove: 'Deshacer',
      groupmeLabel: 'Cuenta de GroupMe', groupmeNone: '— sin vincular —', groupmeOther: 'Vinculada (id {id})',
      groupmeHint: 'La Chona toma como de esta familia lo que escriba esa cuenta en el chat. Elige el nombre con el que escriben, o déjalo sin vincular.',
      ownGroupme: 'Su propio GroupMe', ownGroupmeNone: '— responde la familia —', ownGroupmeTag: 'responde por sí mismo en GroupMe',
      ownGroupmeHint: 'Bailarines adultos con su propio GroupMe: La Chona toma sus respuestas solo como de ellos, y un “no podemos” de los papás no borra lo que ellos ya respondieron. Nombrarlos (“Isaias sí”) sigue contando.',
      groupmeTwice: 'Cada cuenta de GroupMe puede ser de una sola persona.',
      roleTeam: 'Equipo', stateNone: 'Sin responder', stateYes: 'Va', stateMaybe: 'Tal vez', stateNo: 'No va',
      waiting: 'sin respuesta', plusWaiting: '+{n} sin respuesta', everyoneAnswered: 'todos respondieron', rosterSettled: 'Lista completa',
      neverAsked: 'Nunca preguntado', askedAgo: 'Preguntado {when}', rehearsalsShort: 'Ensayos',
      inboxEmptyText: 'Nada nuevo del sitio web. Las solicitudes de los formularios de contacto y cotización aparecen aquí solas.',
      inboxEmptyBtn: 'Crear un evento a mano', noGigsFamilyText: 'Aún no hay eventos publicados. Cuando Mayra y Angel publiquen uno, avisarán en GroupMe.',
      checkMyDancers: 'Ver mis bailarines', allAnsweredText: 'Todo está respondido. ¡Gracias! Te avisamos cuando se publique el próximo.',
      families: 'Familias', addAFamily: 'Agregar familia', botHeard: 'Lo que escuchó La Chona', botLinkedChip: 'Vinculado', notLinked: 'Sin vincular',
      openGig: 'Abrir evento', addRehearsalShort: 'Agregar ensayo',
      going: 'van', ofNeeded: 'de {n} necesarios', moreNeeded: 'faltan {n}', full: 'Lista completa', noneYet: 'Aún sin respuestas',
      moreActions: 'Más', setAnswerFor: 'Respuesta de {name}', clearAnswer: 'Borrar respuesta',
      waitingOn: 'Sin respuesta', tapGigHint: 'Toca un evento para ver quién va y avisar a quien falta.',
      goingAre: 'Van:',
      everyone: 'Toda la familia', allYes: 'Todos sí', allNo: 'Todos no',
      shareInvite: 'Enviar enlace', inviteMsg: 'El enlace de tu familia para los eventos de Ballet Folklórico Mi Herencia — tócalo para marcar quién puede bailar:',
      refresh: 'Actualizar', tryAgain: 'Reintentar', refreshed: 'Actualizado', answered: 'respondieron', answeredLine: '{n} de {total} respondieron', tapName: 'Toca un nombre para responder por esa persona.',
      when: 'Cuándo', where: 'Dónde', needs: 'Necesita', client: 'Cliente', call: 'Llamar', text: 'Mensaje',
      chatOn: 'La Chona está en el chat', chatOff: 'La Chona no está conectada',
      printSchedule: 'Imprimir lista', printShort: 'Imprimir',
      printPick: 'Eventos a incluir', printAll: 'Seleccionar todos', printNone: 'Quitar todos', printCount: '{n} seleccionados',
      printOpen: 'Abrir lista', printShare: 'Compartir', printCopy: 'Copiar enlace',
      printHint: 'Ábrelo y luego toca Imprimir o guardar PDF.',
      printShareMsg: 'Lista de eventos',
      tabMedia: 'Galería', gallery: 'Fotos y videos', galleryN: 'Fotos y videos ({n})', mediaLoading: 'Cargando la galería…',
      storageOff: 'El almacenamiento de fotos y música todavía no está configurado; Mayra y Angel deben conectarlo.', storageLabel: 'Almacenamiento', storageUsed: '{used} de {quota} de espacio gratis usado',
      dances: 'Bailes', dancesHint: 'Todos los videos de un baile, de todos nuestros eventos.', danceVideos: 'Videos de este baile', sortMostDone: 'Más bailados', sortAz: 'A–Z', region: 'Región', allRegions: 'Todas', otherRegion: 'Otra', danceGigsN: 'Bailado en {n} eventos', danceVideosN: '{n} videos', noDanceVideos: 'Todavía no hay videos de este baile.',
      musicLibrary: 'Biblioteca de música', addSongs: 'Agregar canciones', noSongs: 'Todavía no hay canciones. Agrega la música de cada baile para que todos puedan practicar.',
      gigGalleries: 'Galerías de eventos', noGalleryGigs: 'Todavía no hay eventos.',
      newFolder: 'Nueva carpeta', folderHint: 'Para fotos y videos de eventos del grupo que no son presentaciones: una posada, un viaje, un ensayo. No aparece en el Calendario ni en los calendarios de nadie.',
      folderTitlePh: 'p. ej. Posada navideña 2026', folderDateHint: 'Deja la fecha vacía si la carpeta abarca muchos días.', editFolder: 'Editar carpeta', deleteFolder: 'Eliminar carpeta',
      deleteFolderAsk: '¿Eliminar esta carpeta y todo lo que tiene para todos? No se puede deshacer.', folderMenu: 'Opciones de la carpeta', deleteGatheringAsk: '¿Eliminar “{title}” y todas sus fotos y videos para todos? También se quita del calendario. No se puede deshacer.', nothingYet: 'Nada todavía; sé el primero en agregar algo',
      photoOne: '1 foto', photoMany: '{n} fotos', videoOne: '1 video', videoMany: '{n} videos',
      feedSub: 'Noticias de los eventos, y las fotos, videos y música que el grupo ha compartido', blastNew: 'Nuevo evento: ¿pueden bailar?', blastAsk: 'Recordatorio: marquen quién puede bailar', blastConfirmed: 'Evento confirmado', blastCancelled: 'Evento cancelado', blastGathering: 'Nuevo convivio del grupo', blastGatheringAsk: 'Recordatorio: confirma para el convivio', feedAdded: 'agregó {what}', feedAnd: ' y ',
      feedNew: 'Nuevo', feedMore: 'más', feedOlder: 'Ver anteriores', feedEmpty: 'Todavía no se ha agregado nada.', songOne: '1 canción', songMany: '{n} canciones',
      rename: 'Cambiar nombre', untitledSong: 'Canción sin título', addedBy: 'Agregado por {who}', theOwners: 'la familia Ramirez', theFamily: 'la familia {name}',
      youTitle: 'Tú', youSub: 'Las fotos, videos y enlaces que agregues aparecen con esta familia en lugar de “la familia Ramirez”. Sigues teniendo todas las herramientas.',
      youFamily: 'Tu familia', youNone: 'Ninguna — mostrar como “la familia Ramirez”', youSaved: 'Guardado', titleLabel: 'Título',
      deleteMediaAsk: '¿Borrar esto para todos? No se puede deshacer.', deleted: 'Borrado',
      photos: 'Fotos', videos: 'Videos', addMedia: 'Fotos y videos', noMedia: 'Todavía no hay fotos ni videos. Agrega los que tomaste en este evento.',
      openPhoto: 'Abrir foto {n}', openVideo: 'Ver video {n}', previous: 'Anterior', next: 'Siguiente',
      addLink: 'Agregar enlace de YouTube', openYoutube: 'Abrir en YouTube', linkKind: 'Enlace', cover: 'Portada', coverTitle: 'Portada de la carpeta', coverHint: 'Elige la imagen que todos ven en la carpeta de este evento.', coverAuto: 'Elegir automáticamente', coverSet: 'Portada actualizada', addLinkShort: 'YouTube', video: 'Video',
      videoHint: 'Sube fotos y clips de hasta 150 MB aquí. Para presentaciones completas, agrega un enlace de YouTube "No listado".',
      linkHint: 'Cualquiera con la dirección bfmh.dance/familia puede ver esta galería. Pon los videos de YouTube como "No listado" para que no salgan en búsquedas.', linkUrl: 'Enlace',
      uploadingN: 'Subiendo {n} de {total}…', uploadFailed: '{n} no se subieron.', uploadedOne: 'Subido', uploadedMany: '{n} subidos',
      uploadRefused: 'el almacenamiento lo rechazó ({n})', uploadNetwork: 'se cortó la conexión',
      familiesLoading: 'Cargando familias…', dirTitle: '¿De qué familia eres parte?', dirHint: 'Toca tu familia para ver nuestros eventos, fotos, videos y música. Este teléfono te recordará; agrega esta página a tu pantalla de inicio para volver cuando quieras.',
      dirEmpty: 'Todavía no se ha agregado ninguna familia.', ownersHere: 'Los administradores pueden entrar aquí', familiesHere: 'Familias: encuentren a su familia aquí',
      webShow: 'Mostrar en bfmh.dance', webHide: 'Quitar de bfmh.dance', webBadge: 'En bfmh.dance',
      webOn: 'Ya está en bfmh.dance; aparece en unos minutos', webOff: 'Se quitó de bfmh.dance',
      webSuggest: 'Sugerir para bfmh.dance', webWithdraw: 'Retirar sugerencia', webApprove: 'Aprobar para bfmh.dance', webPending: 'Esperando el visto bueno de Mayra o Angel',
      lbShow: 'Mostrar en web', lbHide: 'Quitar de web', lbSuggest: 'Sugerir para web', lbWithdraw: 'Retirar',
      webSuggested: 'Sugerido; Mayra o Angel lo revisarán antes de ponerlo en bfmh.dance',
      reviewTitle: 'Esperando tu visto bueno', reviewHint: 'Las familias sugirieron esto para bfmh.dance. Nada se publica hasta que lo apruebes.',
      approve: 'Aprobar', webDeclined: 'No se pondrá en bfmh.dance',
      printNoGigs: 'Publica un evento primero y luego imprime la lista.', printMax: 'Caben hasta 10 eventos en una página; quita algunos para continuar.',
      logChanges: 'Cambios que hizo', logAttention: 'Por revisar', logAll: 'Todo', logNone: 'Nada por aquí todavía', logShowMore: 'Ver más', guideFold: 'Cómo funciona La Chona',
      undoTitle: '¿Deshacer los cambios de La Chona de este mensaje?', undoConfirm: 'Deshacer', undoDone: 'Restauradas: {n}',
      undoSkipped: '{n} sin tocar: cambiaron después', undoDeleted: '{n} sin tocar: se quitó al bailarín', undoneTag: 'Deshecho',
      undoAlready: 'Ya se deshizo', undoNotFound: 'No se encontró el mensaje', undoFailed: 'No se pudo deshacer — inténtalo de nuevo',
      changesTitle: 'Cambios recientes', changesMore: 'Ver todos', changesEmpty: 'Todavía no hay cambios', changesLoading: 'Cargando…',
      changesGigEdited: '{who} editó {fields}', changesGigCreated: '{who} creó este evento', changesGigDeleted: '{who} eliminó este evento',
      whoBot: 'La Chona ({sender})', whoUndo: 'deshacer', whoSystem: 'sistema',
      gkinds: { potluck: 'Comida compartida', posada: 'Posada', party: 'Fiesta', practice: 'Ensayo', meeting: 'Junta', outing: 'Paseo', fundraiser: 'Recaudación', other: 'Convivio' },
      groupEvents: 'Convivios del grupo', groupEventsSub: 'Comidas, posadas y reuniones. Solo para nosotros, nunca en bfmh.dance. Publícalo en GroupMe para que las familias confirmen, y comparte la invitación con quien quieras.',
      announceEvent: 'Publicar en GroupMe', remindEvent: 'Recordar en GroupMe', eventPosted: 'Publicado en GroupMe; también sale en Actividad', potluckNotes: 'Sugerencias para la comida', potluckNotesPh: 'p. ej. Los universitarios traen postre, las familias con niños chicos traen bebidas…',
      newEvent: 'Nuevo convivio', newWhat: '¿Qué vas a agregar?', addGig: 'Un evento', addGigSub: 'Una presentación. Las familias marcan quién puede bailar.',
      addEvent: 'Un convivio del grupo', addEventSub: 'Comida, posada o reunión, con confirmaciones y una invitación que cualquiera puede abrir.',
      eventKind: 'Tipo de convivio', eventTitlePh: 'p. ej. Posada navideña', eventWhere: 'Dónde', eventWherePh: 'p. ej. Casa de la familia Ramirez',
      eventDetails: 'Descripción', eventDetailsPh: 'De qué se trata, estacionamiento, qué ponerse, traer silla…', potluckToggle: 'Lista de comida: los invitados eligen qué llevar',
      needEventDate: 'Ponle fecha al convivio.', modalNewEvent: 'Nuevo convivio', modalEditEvent: 'Editar convivio',
      eventGoing: '{n} van', eventRsvp: 'Confirmar', youGoingShort: 'Vas', youMaybeShort: 'Tal vez', youNoShort: 'No vas', potluckShort: 'Comida {c}/{n}',
      noEvents: 'No hay convivios próximos.', pastEvents: 'Convivios pasados', loadingEvent: 'Cargando el convivio…',
      shareEvent: 'Compartir invitación', copyEventLink: 'Copiar enlace de la invitación', editEvent: 'Editar convivio', deleteEvent: 'Eliminar convivio', eventMenu: 'Opciones del convivio',
      deleteEventAsk: '¿Eliminar “{title}”? Se borran para todos sus confirmaciones, la lista de comida, las fotos y los videos. No se puede deshacer.',
      addFlyer: 'Agregar un volante', changeFlyer: 'Cambiar el volante', removeFlyer: 'Quitar el volante', removeFlyerAsk: '¿Quitar el volante de “{title}”?',
      flyerUploading: 'Subiendo el volante…', flyerSaved: 'Volante agregado', flyerRemoved: 'Volante quitado', flyerNotImage: 'Elige una foto o imagen del volante',
      eventShareMsg: '¡Te invitamos a {title}! Confirma aquí:', galAll: 'Todo', galGigs: 'Eventos', galEvents: 'Convivios', galEventTag: 'Convivio', noGalleryMatch: 'Nada por aquí todavía.',
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
  function fmtDateShort(s) {
    var full = fmtDate(s);
    return s.slice(0, 4) === String(new Date().getFullYear()) ? full.replace(/,? \d{4}$/, '') : full;
  }
  function fmtTime(ev) { return [ev.start_time, ev.end_time].filter(Boolean).join(' – '); }
  function fmtWhere(ev) { return [ev.venue, ev.city].filter(Boolean).join(' · '); }
  function todayIso() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function isPast(ev) { var d = parseDate(ev.event_date); return d && d < new Date(new Date().setHours(0, 0, 0, 0)); }
  function newestFirst(a, b) { return (b.event_date || '').localeCompare(a.event_date || ''); }
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
    return h('p', { class: 'hint askmeta' }, h('span', { text: t('askedAgo', { when: timeAgo(ev.asked_at) }) }), h('span', { text: t('answeredLine', { n: total - c.pending, total: total }) }));
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
  function loadBotLog() { return api('/api/groupme?limit=120').then(function (d) { state.botLog = d.messages; }).catch(function () { state.botLog = []; }); }
  function refresh() {
    state.loadedAt = Date.now();   // claim the slot first: visibilitychange and focus both fire on one foreground
    var jobs = [loadEvents()];
    if (state.me.role === 'admin') { jobs.push(loadFamilies()); if (state.tab === 'chona') jobs.push(loadBotLog()); }
    if (isMediaTab()) jobs.push(loadMediaIndex());
    jobs.push(isFeedTab() && !media.feedPaged ? loadFeed().catch(function () {}) : loadFeedCount());
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
    // A repaint would rebuild the song list and cut off the track someone is practicing to.
    if (Array.prototype.some.call(document.querySelectorAll('audio, video'), function (m) { return !m.paused; })) return true;
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
    paintBrandRole();
    var chain = Promise.resolve();
    if (key) {
      chain = api('/api/auth', { method: 'POST', body: { key: key } }).then(function () {
        history.replaceState(null, '', location.pathname + location.hash);
      }).catch(function () { toast(t('badLink'), true); });
    }
    if (params.get('e') && params.get('s')) state.gigLink = { e: params.get('e'), s: params.get('s') };
    state.openCal = params.get('cal') === '1'; // the bot's "Add to my calendar" link opens the chooser
    var m = location.hash.match(/^#event-(\d+)/);
    if (m) state.focusEvent = +m[1];
    chain.then(loadMe).then(function (me) {
      if (me.role === 'anon' && state.gigLink) {
        state.focusEvent = +state.gigLink.e;
        return api('/api/gig?e=' + encodeURIComponent(state.gigLink.e) + '&s=' + encodeURIComponent(state.gigLink.s))
          .then(renderPicker, function () { renderLogin(); toast(t('pickBadLink'), true); });
      }
      if (me.role === 'anon') { if (FAMILIA) renderDirectory(); else renderLogin(); return; }
      if (state.gigLink) { state.focusEvent = +state.gigLink.e; history.replaceState(null, '', location.pathname + '#event-' + state.gigLink.e); }
      if (me.role === 'admin') state.tab = ADMIN_SITE ? 'insights' : 'inbox';
      track('open', null, null, [state.lang, isStandalone() ? 'app' : 'web', state.gigLink ? 'gig' : FAMILIA ? 'familia' : 'team'].join('|'));
      return refresh();
    }).catch(function (e) {
      app.innerHTML = '';
      app.appendChild(emptyState('refresh', e.message,
        h('button', { class: 'btn btn-sm btn-gold', text: t('tryAgain'), onclick: function () { location.reload(); } })));
    });
  }
  function setLangSilently(l) { state.lang = l; document.documentElement.lang = l; try { localStorage.setItem('bfmh_team_lang', l); } catch (e) {} }
  function paintBrandRole() {
    var el = document.getElementById('brand-role'); if (!el) return;
    el.textContent = t(FAMILIA ? 'familia' : ADMIN_SITE ? 'roleAdmin' : 'roleTeam');
    var link = el.closest('a');
    link.href = FAMILIA || state.pickerGig ? '/familia' : ADMIN_SITE ? '/admin' : '/team/';
    link.setAttribute('aria-label', 'Ballet Folklórico Mi Herencia — ' + el.textContent);
  }

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
      h('h1', { text: t(ADMIN_SITE ? 'adminLoginTitle' : 'loginTitle') }),
      h('p', { text: t(ADMIN_SITE ? 'adminLoginText' : 'loginText') }),
      h('label', { class: 'f f-hidden' }, t('signInAs'), who),
      h('label', { class: 'f' }, t('ownerPassword'), pw),
      h('div', { class: 'card-actions' }, h('button', { class: 'btn btn-gold', type: 'submit', text: t('signIn') })),
      err,
      state.me && state.me.configured === false ? h('p', { class: 'hint', text: t('notConfigured') }) : null
    );
    app.appendChild(form);
    if (!ADMIN_SITE) app.appendChild(h('a', { class: 'btn btn-wide familia-link', href: '/familia' }, icon('people', 2), t('familiesHere')));
  }

  /* Back to the picker, not the login: a shared phone can switch families without the link. */
  function signOut() {
    var back = state.gigLink ? '/team/?e=' + encodeURIComponent(state.gigLink.e) + '&s=' + encodeURIComponent(state.gigLink.s)
      : state.me && state.me.role === 'member' ? '/familia' : ADMIN_SITE ? '/admin' : '/team/';
    api('/api/auth', { method: 'DELETE' }).then(function () { location.href = back; });
  }

  function loader(text) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'tm-twirl'); svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = '<circle class="tw tw-3" cx="50" cy="50" r="42"/><circle class="tw tw-2" cx="50" cy="50" r="31"/>'
      + '<circle class="tw tw-1" cx="50" cy="50" r="20"/><circle class="tw-core" cx="50" cy="50" r="6"/>';
    return h('div', { class: 'tm-boot', role: 'status' }, svg, h('p', { class: 'tm-boot-text', text: text }));
  }

  function renderDirectory() {
    tabsEl.hidden = true; fabRoot.innerHTML = ''; paintBrandRole();
    headerRight.innerHTML = ''; headerRight.appendChild(langToggle()); app.innerHTML = '';
    var err = h('p', { class: 'error' });
    var grid = h('div', { class: 'pickgrid' }, loader(t('familiesLoading')));
    app.appendChild(h('div', { class: 'card familia' },
      h('h3', { class: 'card-title', text: t('dirTitle') }),
      h('p', { class: 'card-meta', text: t('dirHint') }),
      grid, err,
      h('p', { class: 'hint', text: t('pickNotListed') })));
    app.appendChild(h('p', { class: 'hint familia-owners' }, h('a', { href: '/team/', text: t('ownersHere') })));
    api('/api/auth?families').then(function (d) {
      grid.innerHTML = '';
      if (!d.families.length) { grid.appendChild(h('p', { class: 'card-meta', text: t('dirEmpty') })); return; }
      d.families.forEach(function (f) {
        grid.appendChild(h('button', { class: 'btn pickbtn', type: 'button', onclick: function () {
          err.textContent = '';
          api('/api/auth', { method: 'POST', body: { directory: f.id } }).then(function () { location.reload(); })
            .catch(function (x) { err.textContent = x.message; });
        } }, h('b', { text: f.name }), h('span', { class: 'pickkids', text: f.dancers.join(', ') })));
      });
    }, function (e) { grid.innerHTML = ''; err.textContent = e.message; });
  }

  /* No password here — being in the GroupMe chat is the guest list. */
  function renderPicker(gig) {
    state.pickerGig = gig;
    tabsEl.hidden = true; fabRoot.innerHTML = ''; paintBrandRole();
    headerRight.innerHTML = ''; headerRight.appendChild(langToggle()); app.innerHTML = '';

    var ev = gig.event;
    app.appendChild(h('div', { class: 'card' },
      h('div', { class: 'card-head' },
        h('div', { class: 'card-headmain' }, pill(ev.status), h('h3', { class: 'card-title', text: evTitle(ev) }),
          factList(ev)),
        dateBox(ev)),
      ev.details ? h('p', { class: 'card-text', text: ev.details }) : null));

    var pickCal = calButton(ev);
    if (pickCal) {
      app.appendChild(h('div', { class: 'card cal-card' }, h('div', { class: 'card-actions' }, pickCal),
        h('p', { class: 'hint', text: t(ev.status === 'cancelled' ? 'removeFromCalHint' : 'addToCalHint') })));
      if (state.openCal) { state.openCal = false; calSheet(ev, calHref(ev)); }
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
    website: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 8.5h18M12 17.5v-6m-3 3 3-3 3 3"/>',
    chat: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.9-.9L3 21l1.9-4.6A8.4 8.4 0 0 1 4 11.5a8.4 8.4 0 0 1 9-8.4 8.4 8.4 0 0 1 8 8.4z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
    printer: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="9" rx="2"/><path d="M6 14h12v7H6z"/>',
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
    back: '<path d="m15 5-7 7 7 7"/>',
    pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
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
    if (!href) return null;
    var gone = ev.status === 'cancelled';
    return h('button', { type: 'button', class: 'btn btn-sm cal-btn', onclick: function () { calSheet(ev, href); } },
      icon('calendar', 2.2), t(gone ? 'removeFromCal' : 'addToCal'));
  }
  function calSheet(ev, href) { return ev.status === 'cancelled' ? removeEventSheet(ev, href) : addEventSheet(ev, href); }
  function removeEventSheet(ev, href) {
    var pop = popSheet(t('removeFromCal'), t('removeEventHint'));
    var list = h('div', { class: 'acts' });
    var cal = ev.calendar || {};
    [
      [t('calApple'), href + '&remove=1', false],
      [t('calGoogle'), cal.google_day || href + '&remove=1&to=google', true],
      [t('calOutlook'), cal.outlook_day || href + '&remove=1&to=outlook', true],
    ].forEach(function (row) {
      var attrs = { class: 'act', href: row[1], onclick: function () { pop.close(); } };
      if (row[2]) { attrs.target = '_blank'; attrs.rel = 'noopener'; }
      list.appendChild(h('a', attrs, h('span', { class: 'act-ico' }, icon('calendar', 2)), h('span', { text: row[0] })));
    });
    pop.body.appendChild(list);
    pop.body.appendChild(h('button', { type: 'button', class: 'act-close', text: t('cancel'), onclick: pop.close }));
  }
  function addEventSheet(ev, href) {
    var pop = popSheet(t('subscribePick'), t('addEventHint'));
    var list = h('div', { class: 'acts' });
    // Google/Outlook get the direct link from the API when the gig has one; the cookie-bound
    // /api/calendar redirect is only a fallback, since the installed app doesn't always carry it.
    var cal = ev.calendar || {};
    [
      [t('calApple'), href, false, 'apple'],
      [t('calGoogle'), cal.google || href + '&to=google', true, 'google'],
      [t('calOutlook'), cal.outlook || href + '&to=outlook', true, 'outlook'],
    ].forEach(function (row) {
      var attrs = { class: 'act', href: row[1], onclick: function () { track('calendar', ev.id, null, 'gig:' + row[3]); pop.close(); } };
      if (row[2]) { attrs.target = '_blank'; attrs.rel = 'noopener'; }
      list.appendChild(h('a', attrs, h('span', { class: 'act-ico' }, icon('calendar', 2)), h('span', { text: row[0] })));
    });
    pop.body.appendChild(list);
    if ((ev.rehearsals || []).some(function (r) { return r && r.date; })) {
      pop.body.appendChild(h('p', { class: 'hint', text: t('calRehearsalNote') }));
    }
    pop.body.appendChild(h('button', { type: 'button', class: 'act-close', text: t('cancel'), onclick: pop.close }));
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
      [t('calApple'), url.replace(/^https?:/, 'webcal:'), 'apple'],
      [t('calGoogle'), 'https://calendar.google.com/calendar/r?cid=' + encodeURIComponent(url), 'google'],
      [t('calOutlook'), 'https://outlook.live.com/calendar/0/addfromweb?url=' + encodeURIComponent(url) + '&name=' + encodeURIComponent(feedName()), 'outlook'],
    ].forEach(function (row) {
      list.appendChild(h('a', { class: 'act', href: row[1], target: '_blank', rel: 'noopener', onclick: function () { track('calendar', null, null, 'feed:' + row[2]); pop.close(); } },
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

  function printSheet() {
    var candidates = state.events.filter(function (e) { return (e.status === 'open' || e.status === 'confirmed') && e.event_date && !isPast(e); })
      .sort(function (a, b) { return (a.event_date || '').localeCompare(b.event_date || '') || a.id - b.id; });
    if (!candidates.length) { toast(t('printNoGigs')); return; }
    if (!(state.me && state.me.sheet_key)) {
      api('/api/me').then(function (me) { state.me = me; }).catch(function (e) { toast(e.message, true); });
    }
    var checked = {};
    candidates.forEach(function (e, i) { checked[e.id] = i < 10; });
    function buildUrl() {
      var ids = candidates.filter(function (e) { return checked[e.id]; }).map(function (e) { return e.id; });
      var sheet = ids.length === candidates.length ? 'all' : ids.join(',');
      var key = state.me && state.me.sheet_key || '';
      return location.origin + '/api/events?sheet=' + sheet + '&a=' + encodeURIComponent(key) + '&lang=' + state.lang;
    }
    var countEl = h('span', { class: 'print-count' });
    var openBtn = h('button', { class: 'btn btn-gold', text: t('printOpen'), onclick: function () {
      var url = buildUrl(); if (!window.open(url, '_blank')) location.href = url;
    } });
    var canShare = navigator.share && (/Android|iPhone|iPad/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1));
    var shareBtn = canShare ? h('button', { class: 'btn', text: t('printShare'), onclick: function () {
      navigator.share({ title: 'Ballet Folklórico Mi Herencia', text: t('printShareMsg'), url: buildUrl() }).catch(function () {});
    } }) : null;
    var copyBtn = h('button', { class: 'btn', text: t('printCopy'), onclick: function () { copyText(buildUrl()); } });
    var allBtn = h('button', { type: 'button', class: 'btn-link', text: t('printAll') });
    var noneBtn = h('button', { type: 'button', class: 'btn-link', text: t('printNone') });
    function updateCount() {
      var n = candidates.filter(function (e) { return checked[e.id]; }).length;
      var over = n > 10;
      countEl.textContent = over ? n + ' / 10' : t('printCount', { n: n });
      countEl.classList.toggle('over', over);
      openBtn.disabled = n === 0 || over; if (shareBtn) shareBtn.disabled = n === 0 || over; copyBtn.disabled = n === 0 || over;
      allBtn.hidden = n === candidates.length; noneBtn.hidden = n === 0;
    }
    var rows = [];
    var list = h('div', { class: 'print-list' });
    candidates.forEach(function (e) {
      var input = h('input', { type: 'checkbox', checked: true, onchange: function () { checked[e.id] = input.checked; updateCount(); } });
      var where = fmtWhere(e);
      list.appendChild(h('label', { class: 'print-row' }, input,
        h('div', { class: 'print-txt' }, h('div', { class: 'l1', text: evTitle(e) }), h('div', { class: 'l2', text: fmtDate(e.event_date) + (where ? ' · ' + where : '') }))));
      rows.push(input);
    });
    function setAll(on) { candidates.forEach(function (e) { checked[e.id] = on; }); rows.forEach(function (r) { r.checked = on; }); updateCount(); }
    allBtn.addEventListener('click', function () { setAll(true); });
    noneBtn.addEventListener('click', function () { setAll(false); });
    var body = h('div', { class: 'print-pick' },
      h('div', { class: 'print-head' }, h('div', { class: 'print-label' }, h('span', { text: t('printPick') }), countEl), h('div', { class: 'print-links' }, allBtn, noneBtn)),
      list,
      candidates.length > 10 ? h('p', { class: 'print-note', text: t('printMax') }) : null,
      h('p', { class: 'print-note', text: t('printHint') }));
    updateCount();
    modal(t('printSchedule'), body, h('div', { class: 'foot-btns print-foot' + (shareBtn ? ' print-foot-3' : '') }, openBtn, shareBtn, copyBtn));
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
  function factList(ev) {
    var facts = h('div', { class: 'facts' });
    if (fmtTime(ev) || ev.call_time) {
      facts.appendChild(h('div', { class: 'fact' }, icon('clock', 2), h('span', {}, fmtTime(ev) ? h('b', { text: fmtTime(ev) }) : null,
        ev.call_time ? h('span', { class: fmtTime(ev) ? 'fact-sub' : '', text: t('callTime') + ': ' + ev.call_time }) : null)));
    }
    if (fmtWhere(ev) || ev.address) {
      var q = encodeURIComponent([ev.venue, ev.address, ev.city].filter(Boolean).join(', '));
      facts.appendChild(h('div', { class: 'fact' }, icon('pin', 2), h('a', { href: 'https://maps.apple.com/?q=' + q, target: '_blank', rel: 'noopener' },
        fmtWhere(ev) ? h('b', { text: fmtWhere(ev) }) : null,
        ev.address ? h('span', { class: fmtWhere(ev) ? 'fact-sub' : '', text: ev.address }) : null)));
    }
    if (ev.dancers_needed) facts.appendChild(h('div', { class: 'fact' }, icon('people', 2), h('span', { text: t('dancersNeeded', { n: ev.dancers_needed }) })));
    if (ev.pay && state.me && state.me.role === 'admin') facts.appendChild(h('div', { class: 'fact' }, h('span', { class: 'fact-sym', text: '$' }), h('span', { text: t('pay') + ': ' + ev.pay })));
    return facts.childNodes.length ? facts : null;
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
    fabRoot.innerHTML = '';
    paintBrandRole();
    if (state.focusEvent) state.mtab = 'gigs';
    tabsEl.hidden = false; tabsEl.innerHTML = '';
    [['gigs', 'tabGigs', 'calendar'], ['feed', 'tabFeed', 'pulse'], ['media', 'tabMedia', 'image']].forEach(function (tb) {
      tabsEl.appendChild(h('button', { class: 'tm-tab' + (state.mtab === tb[0] ? ' is-active' : ''), 'aria-current': state.mtab === tb[0] ? 'page' : false,
        onclick: function () { if (tb[0] === 'feed') freshFeedVisit(); if (state.mtab !== tb[0]) track('tab', null, null, tb[0]); state.mtab = tb[0]; render(); } },
        h('span', { class: 'tm-tab-ico' }, icon(tb[2], 2)), h('span', { class: 'tm-tab-label', text: t(tb[1]) }), tb[0] === 'feed' ? feedBadge() : null));
    });
    headerRight.innerHTML = '';
    headerRight.appendChild(h('span', { class: 'tm-who' },
      h('span', { class: 'tm-who-label', text: t('familia') }), h('span', { class: 'tm-who-name', text: me.family.name })));
    headerRight.appendChild(langToggle());
    headerRight.appendChild(h('button', { class: 'btn btn-sm', text: t('signOut'), onclick: signOut }));
    app.innerHTML = '';
    if (state.mtab === 'media') { renderMediaTab(); return; }
    if (state.mtab === 'feed') { renderFeedTab(); return; }
    me.dancers.forEach(function (d) { d.family = me.family.name; d.family_id = me.family.id; });

    var mine = {}; me.dancers.forEach(function (d) { mine[d.id] = d; });
    function myAnswers(ev) { var out = {}; (ev.availability || []).forEach(function (a) { if (mine[a.dancer_id]) out[a.dancer_id] = a; }); return out; }
    var needs = [], upcoming = [], past = [];
    state.events.forEach(function (ev) {
      if (isGathering(ev)) return;
      if (isPast(ev) || ev.status === 'done') { past.push(ev); return; }
      var ans = myAnswers(ev);
      if (ev.status === 'open' && me.dancers.some(function (d) { return !ans[d.id]; })) needs.push(ev); else upcoming.push(ev);
    });

    if (!me.dancers.length) app.appendChild(h('div', { class: 'card' }, h('p', { class: 'card-meta', text: t('addDancersFirst') })));
    gatherSection(false);
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
    if (past.length) {
      var pastSec = section(t('recent'), past.length);
      pastSec.className += ' tm-sec-fold';
      app.appendChild(h('details', { class: 'tm-fold' }, h('summary', { class: 'tm-fold-summary' }, pastSec),
        past.sort(newestFirst).map(function (ev) { return memberCard(ev, myAnswers(ev), true); })));
    }

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
          factList(ev)),
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
    card.appendChild(h('div', { class: 'card-actions' }, calButton(ev), galleryButton(ev)));
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
  var TABS = [['inbox', 'tabInbox', 'mail'], ['gigs', 'tabGigs', 'calendar'], ['feed', 'tabFeed', 'pulse'], ['media', 'tabMedia', 'image'], ['team', 'tabTeam', 'people'], ['chona', 'tabChona', null]];
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
      if (f && isGathering(f)) { state.tab = 'gigs'; state.focusEvent = null; if (!partyUI || partyUI.id !== f.id) openParty(f.id); }
      else if (f) { state.tab = f.status === 'inquiry' ? 'inbox' : 'gigs'; if (f.status !== 'inquiry') { state.detail = f.id; state.focusEvent = null; } }
    }
    var listening = state.me.channels && state.me.channels.groupme_listen;
    tabsEl.hidden = false; tabsEl.innerHTML = '';
    var tabs = hasInsights() ? [['insights', 'tabInsights', 'chart']].concat(TABS) : TABS;
    tabsEl.classList.toggle('has-7', tabs.length > 6);
    tabs.forEach(function (tb) {
      tabsEl.appendChild(h('button', { class: 'tm-tab' + (state.tab === tb[0] ? ' is-active' : ''), 'aria-current': state.tab === tb[0] ? 'page' : false,
        onclick: function () { if (tb[0] === 'feed') freshFeedVisit(); if (state.tab !== tb[0]) track('tab', null, null, tb[0]); state.tab = tb[0]; state.detail = null; render(); if (tb[0] === 'chona' && state.botLog === null) loadBotLog().then(render); } },
        tb[0] === 'chona'
          ? h('span', { class: 'tm-tab-ico' }, h('img', { class: 'tm-tab-face', src: '/images/optimized/la-chona-sm.webp', alt: '' }), h('i', { class: 'tm-tab-dot' + (listening ? ' on' : '') }))
          : h('span', { class: 'tm-tab-ico' }, icon(tb[2], 2)),
        h('span', { class: 'tm-tab-label', text: t(tb[1]) }),
        tb[0] === 'inbox' && inquiries.length ? h('span', { class: 'count', text: inquiries.length }) : null,
        tb[0] === 'feed' ? feedBadge() : null));
    });

    fabRoot.innerHTML = '';
    if (state.tab === 'inbox' || state.tab === 'gigs') {
      fabRoot.appendChild(h('button', { class: 'fab', 'aria-label': state.tab === 'gigs' ? t('newWhat') : t('newGig'),
        onclick: function () { if (state.tab === 'gigs') newSomethingSheet(); else openEventModal(null); } }, icon('plus', 2.5)));
    }

    app.innerHTML = '';
    if (state.tab === 'inbox') renderInbox(inquiries);
    else if (state.tab === 'gigs') renderGigs();
    else if (state.tab === 'chona') renderChona();
    else if (state.tab === 'media') renderMediaTab();
    else if (state.tab === 'feed') renderFeedTab();
    else if (state.tab === 'insights' && hasInsights()) renderInsightsTab();
    else renderTeam();
    focusIfNeeded();
  }

  function renderInbox(inquiries) {
    var shown = filterInquiries(inquiries);
    if (state.focusEvent && !shown.some(function (e) { return e.id === state.focusEvent; }) && inquiries.some(function (e) { return e.id === state.focusEvent; })) {
      state.inbox.range = 'all'; state.inbox.pick = false; state.inbox.from = ''; state.inbox.to = '';
      shown = filterInquiries(inquiries);
    }
    var filtered = shown.length !== inquiries.length;
    app.appendChild(section(t('newInquiries'), filtered ? t('ofTotal', { n: shown.length, total: inquiries.length }) : inquiries.length));
    app.appendChild(h('p', { class: 'tm-sub', text: t('inboxSub') }));
    if (inquiries.length) app.appendChild(inboxFilters());
    if (!inquiries.length) {
      app.appendChild(emptyState('mail', t('inboxEmptyText'),
        h('button', { class: 'btn btn-sm btn-gold', text: t('inboxEmptyBtn'), onclick: function () { openEventModal(null); } })));
    } else if (!shown.length) {
      app.appendChild(emptyState('mail', t('noMatch'),
        h('button', { class: 'btn btn-sm', text: t('clearFilters'), onclick: function () { setInbox({ range: 'all', from: '', to: '', pick: false }); } })));
    }
    shown.forEach(function (ev) { app.appendChild(adminCard(ev)); });
    var archived = state.events.filter(function (e) { return ['declined', 'cancelled', 'lapsed'].indexOf(e.status) !== -1; });
    if (archived.length) {
      var archSec = section(t('archived'), archived.length);
      archSec.className += ' tm-sec-fold';
      var arch = h('details', { class: 'tm-fold', ontoggle: function () { state.archivedOpen = arch.open; } },
        h('summary', { class: 'tm-fold-summary' }, archSec), h('p', { class: 'hint', text: t('archivedHint') }), archived.map(adminCard));
      arch.open = !!state.archivedOpen;
      app.appendChild(arch);
    }
  }

  function setInbox(patch) { Object.keys(patch).forEach(function (k) { state.inbox[k] = patch[k]; }); saveInboxPrefs(); render(); }

  function filterInquiries(list) {
    var f = state.inbox, today = new Date(new Date().setHours(0, 0, 0, 0));
    var from = f.pick && f.from ? parseDate(f.from) : null, to = f.pick && f.to ? parseDate(f.to) : null;
    var out = list.filter(function (ev) {
      var d = parseDate(ev.event_date);
      if (f.range === 'tbd') return !d;
      if (f.range === 'upcoming' && !(d && d >= today)) return false;
      if (f.range === 'past' && !(d && d < today)) return false;
      if ((from || to) && !d) return false;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
    var newest = function (a, b) { return String(b.created_at || '').localeCompare(String(a.created_at || '')) || b.id - a.id; };
    out.sort(f.sort === 'eventDate'
      ? function (a, b) { var da = parseDate(a.event_date), db = parseDate(b.event_date); if (!da && !db) return newest(a, b); if (!da) return 1; if (!db) return -1; return da - db || newest(a, b); }
      : newest);
    return out;
  }

  function chip(label, on, fn, cls) { return h('button', { type: 'button', class: 'fchip' + (on ? ' is-on' : '') + (cls ? ' ' + cls : ''), 'aria-pressed': on ? 'true' : 'false', text: label, onclick: fn }); }
  function inboxFilters() {
    var f = state.inbox;
    var sort = h('div', { class: 'frow' }, h('span', { class: 'flabel', text: t('sortBy') }),
      chip(t('sortNewest'), f.sort === 'newest', function () { setInbox({ sort: 'newest' }); }),
      chip(t('sortEventDate'), f.sort === 'eventDate', function () { setInbox({ sort: 'eventDate' }); }));
    var show = h('div', { class: 'frow' }, h('span', { class: 'flabel', text: t('showLabel') }));
    [['all', 'filterAll'], ['upcoming', 'filterUpcoming'], ['tbd', 'filterTbd'], ['past', 'filterPast']].forEach(function (r) {
      show.appendChild(chip(t(r[1]), f.range === r[0] && !f.pick, function () { setInbox({ range: r[0], pick: false }); }));
    });
    show.appendChild(chip(t('filterDates'), f.pick, function () { setInbox({ pick: !f.pick, range: f.pick ? f.range : 'all' }); }, 'fchip-dates'));
    var bar = h('div', { class: 'filterbar' }, sort, show);
    if (f.pick) {
      var dateIn = function (key, label) {
        var inp = h('input', { type: 'date', value: f[key], 'aria-label': label });
        // Chrome fires change per typed segment (year "0002"); only apply once the year is real.
        var apply = function () { if (inp.value === f[key]) return; var p = {}; p[key] = inp.value; setInbox(p); };
        var valid = function () { return !inp.value || /^[12]\d{3}-/.test(inp.value); };
        inp.addEventListener('change', function () { if (valid()) apply(); });
        inp.addEventListener('blur', function () { setTimeout(function () { if (valid()) apply(); }, 0); });
        return h('label', { class: 'fdate' }, h('span', { text: label }), inp);
      };
      bar.appendChild(h('div', { class: 'frow fdates' }, dateIn('from', t('filterFrom')), dateIn('to', t('filterTo')),
        (f.from || f.to) ? h('button', { type: 'button', class: 'btn btn-sm', text: t('clearFilters'), onclick: function () { setInbox({ from: '', to: '' }); } }) : null));
    }
    return bar;
  }

  function renderGigs() {
    var live = state.events.filter(function (e) { return (e.status === 'open' || e.status === 'confirmed') && !isPast(e); });
    var past = state.events.filter(function (e) { return e.status === 'done' || ((e.status === 'open' || e.status === 'confirmed') && isPast(e)); }).sort(newestFirst);
    app.appendChild(section(t('posted'), live.length, h('button', { class: 'btn btn-sm btn-print', onclick: printSheet, 'aria-label': t('printSchedule') }, icon('printer', 2.2), h('span', { class: 'lbl-long', text: t('printSchedule') }), h('span', { class: 'lbl-short', text: t('printShort') }))));
    app.appendChild(h('p', { class: 'tm-sub', text: t('tapGigHint') }));
    if (!live.length) {
      app.appendChild(emptyState('calendar', t('nothingPosted'),
        h('button', { class: 'btn btn-sm btn-gold', text: t('newGig'), onclick: function () { openEventModal(null); } })));
    } else {
      app.appendChild(gigList(live));
    }
    gatherSection(true);
    if (past.length) {
      var pastSec = section(t('past'), past.length);
      pastSec.className += ' tm-sec-fold';
      app.appendChild(h('details', { class: 'tm-fold' }, h('summary', { class: 'tm-fold-summary' }, pastSec), gigList(past)));
    }
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
          gigFacts(ev),
          askedLine(ev)),
        headcount(ev, c),
        h('div', { class: 'gigmeter' }, meterBar(c), tallyRow(c), goingNames(ev)),
        h('span', { class: 'giggo' }, icon('chevron', 2.5)));
      list.appendChild(row);
    });
    return list;
  }

  function gigFacts(ev) {
    var out = h('div', { class: 'gigfacts' });
    if (fmtTime(ev) || ev.call_time) out.appendChild(h('span', { class: 'gigfact' }, icon('clock', 2), h('span', { text: [fmtTime(ev), ev.call_time ? t('callTime') + ': ' + ev.call_time : null].filter(Boolean).join(' · ') })));
    var title = (ev.title || '').toLowerCase();
    var place = [ev.venue, ev.city].filter(function (v) { return v && title.indexOf(v.toLowerCase()) === -1; }).join(' · ');
    place = [place, ev.address].filter(Boolean).join(', ');
    if (place) out.appendChild(h('span', { class: 'gigfact' }, icon('pin', 2), h('span', { text: place })));
    return out;
  }
  function adminCard(ev) {
    var card = h('div', { class: 'card', id: 'event-' + ev.id });
    card.appendChild(h('div', { class: 'card-head' },
      h('div', { class: 'card-headmain' }, pill(ev.status),
        h('h3', { class: 'card-title sm' }, h('button', { text: ev.title || t('untitled'), onclick: function () { openDetail(ev.id); } }))),
      dateBox(ev)));
    if (ev.status === 'inquiry' || ev.client_name || fmtWhere(ev) || fmtTime(ev) || ev.call_time) {
      card.appendChild(clientBlock(ev, true));
      if (ev.message) card.appendChild(h('p', { class: 'card-text', text: ev.message }));
    }
    var twin = ev.status === 'inquiry' && sameDayGig(ev);
    if (twin) card.appendChild(h('button', { type: 'button', class: 'twin-hint', onclick: function () { mergeInto(ev, twin); } },
      icon('link', 2.2), h('span', { text: t('sameDayHint', { gig: evTitle(twin) }) }), h('b', { text: t('mergeGo') })));
    var actions = h('div', { class: 'card-actions' });
    if (ev.status === 'inquiry') {
      actions.appendChild(ev.event_date
        ? h('button', { class: 'btn btn-gold btn-main', onclick: function (e) { askGroup(ev, null, e.currentTarget); } }, icon('chat', 2), t('askGroup').replace(/^📢\s*/, ''))
        : h('button', { class: 'btn btn-gold btn-main', onclick: function () { doAction(ev, 'publish'); } }, icon('chat', 2), t('postToTeam')));
      actions.appendChild(h('button', { class: 'btn btn-icon', 'aria-label': t('moreActions'), onclick: function () { actionSheet(evTitle(ev), inquiryActions(ev)); } }, icon('more', 2)));
    } else {
      actions.appendChild(h('button', { class: 'btn', text: t('reopen'), onclick: function () { doAction(ev, 'reopen'); } }));
      actions.appendChild(h('button', { class: 'btn btn-danger', text: t('del'), onclick: function () { deleteEvent(ev); } }));
    }
    card.appendChild(actions);
    return card;
  }

  // withFacts: where/when/needs rows — the detail sheet gets those from factList instead.
  function clientBlock(ev, withFacts) {
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
    if (withFacts && (fmtWhere(ev) || ev.address)) dl.appendChild(h('div', {}, h('dt', { text: t('where') }), h('dd', { text: [fmtWhere(ev), ev.address].filter(Boolean).join(', ') })));
    if (ev.date_text) dl.appendChild(h('div', {}, h('dt', { text: t('clientWroteShort') }), h('dd', { text: '“' + ev.date_text + '”' })));
    if (withFacts && (fmtTime(ev) || ev.call_time)) dl.appendChild(h('div', {}, h('dt', { text: t('when') }), h('dd', { text: [fmtTime(ev), ev.call_time ? t('callTime') + ': ' + ev.call_time : null].filter(Boolean).join(' · ') })));
    if (withFacts && ev.dancers_needed) dl.appendChild(h('div', {}, h('dt', { text: t('needs') }), h('dd', { text: t('dancersNeeded', { n: ev.dancers_needed }) })));
    if (ev.status === 'inquiry' || ev.client_name) dl.appendChild(h('div', {}, h('dt', { text: t('received') }), h('dd', { text: new Date(ev.created_at).toLocaleString(state.lang === 'es' ? 'es-US' : 'en-US') + (ev.source ? ' ' + t('via') + ' ' + ev.source : '') })));
    return dl;
  }

  function websiteAction(ev) {
    return { label: ev.website ? t('hideFromWebsite') : t('showOnWebsite'), icon: 'globe', onclick: function () {
      api('/api/events/' + ev.id, { method: 'PATCH', body: { website: !ev.website } })
        .then(function () { toast(ev.website ? t('websiteOff') : t('websiteOn')); return refresh(); })
        .catch(function (e) { toast(e.message, true); });
    } };
  }
  // Mirrors the statuses api/public-events.js serves; the toggle is hidden where the site would ignore it.
  function canShowOnWebsite(ev) { return !!ev.event_date && ['open', 'confirmed', 'done'].indexOf(ev.status) !== -1; }
  function websiteRow(ev) {
    if (!canShowOnWebsite(ev)) return null;
    var act = websiteAction(ev);
    return h('div', { class: 'site-row' + (ev.website ? ' is-on' : '') },
      h('button', { type: 'button', class: 'site-toggle', role: 'switch', 'aria-checked': ev.website ? 'true' : 'false', onclick: act.onclick },
        icon('globe', 2.2), h('span', { class: 'site-label', text: ev.website ? t('websiteRowOn') : t('websiteRowOff') }), h('span', { class: 'switch' })),
      h('p', { class: 'hint', text: t('websiteRowHint') }));
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
  function confirmSheet(message, okLabel, danger, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var pop = popSheet(null);
      pop.body.appendChild(h('p', { class: 'pop-msg', text: message }));
      var on = opts.toggle ? !!opts.toggle.on : false;
      if (opts.toggle) {
        var row = h('button', { type: 'button', class: 'pop-toggle' + (on ? ' is-on' : ''), role: 'switch', 'aria-checked': on ? 'true' : 'false',
          onclick: function () { on = !on; row.classList.toggle('is-on', on); row.setAttribute('aria-checked', on ? 'true' : 'false'); } },
          icon('chat', 2.2), h('span', { class: 'site-label', text: opts.toggle.label }), h('span', { class: 'switch' }));
        pop.body.appendChild(row);
      }
      pop.body.appendChild(h('div', { class: 'pop-btns' },
        h('button', { class: 'btn btn-wide ' + (danger ? 'btn-danger-fill' : 'btn-gold'), text: okLabel || t('done'), onclick: function () { pop.close(); resolve(opts.toggle ? { toggle: on } : true); } }),
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
    var quiet = false;
    var quietRow = isNew ? h('button', { type: 'button', class: 'pop-toggle full', role: 'switch', 'aria-checked': 'false',
      onclick: function () { quiet = !quiet; quietRow.classList.toggle('is-on', quiet); quietRow.setAttribute('aria-checked', quiet ? 'true' : 'false'); } },
      icon('calendar', 2.2), h('span', { class: 'site-label', text: t('addQuietlyNew') }), h('span', { class: 'switch' })) : null;
    var err = h('p', { class: 'error' });
    var form = h('form', { class: 'form-grid', id: 'event-form', onsubmit: function (e) {
      e.preventDefault(); err.textContent = '';
      var fd = new FormData(form); var body = {};
      fd.forEach(function (v, k) { body[k] = v; });
      body.rehearsals = rehearsals.filter(function (r) { return r.date || r.time || r.location; });
      if (!body.title) { err.textContent = t('needTitle'); return; }
      var p;
      if (isNew) {
        body.status = quiet ? 'open' : 'inquiry';
        p = api('/api/events', { method: 'POST', body: body });
      } else {
        p = api('/api/events/' + ev.id, { method: 'PATCH', body: body });
      }
      p.then(function () {
        closeModal();
        toast(t('saved'));
        if (back) state.detail = back;
        if (quiet) state.tab = 'gigs';
        return refresh();
      }).catch(function (x) { err.textContent = x.message; });
    } },
      field(t('title'), inp('title', ev, { placeholder: t('titlePh'), required: true }), true, true),
      quietRow,
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
  function addQuietly(ev) {
    return { label: t('addQuietly'), icon: 'calendar', onclick: function () {
      doAction(ev, 'publish', { notify: false }).then(function (d) { if (d) { state.tab = 'gigs'; render(); } });
    } };
  }
  var MERGE_INTO = ['open', 'confirmed', 'done', 'cancelled'];
  function sameDayGig(ev) {
    // A gig that already has a client came from its own inquiry, so it can't be this one's twin.
    return ev.event_date && state.events.find(function (g) { return g.id !== ev.id && g.event_date === ev.event_date && MERGE_INTO.indexOf(g.status) !== -1 && !g.client_name && !g.client_email; });
  }
  function mergeAction(ev) { return { label: t('mergeIntoGig'), icon: 'link', onclick: function () { mergeSheet(ev); } }; }
  function mergeSheet(ev) {
    api('/api/events?all=1').then(function (d) {
      var at = parseDate(ev.event_date) || new Date();
      var gigs = d.events.filter(function (g) { return g.id !== ev.id && g.event_date && MERGE_INTO.indexOf(g.status) !== -1; })
        .sort(function (a, b) { return Math.abs(parseDate(a.event_date) - at) - Math.abs(parseDate(b.event_date) - at); })
        .slice(0, 8);
      if (!gigs.length) return toast(t('mergeNone'), true);
      var pop = popSheet(t('mergePick'), t('mergeSub'));
      var list = h('div', { class: 'acts' });
      gigs.forEach(function (g) {
        var same = g.event_date === ev.event_date;
        list.appendChild(h('button', { class: 'act', onclick: function () { pop.close(); mergeInto(ev, g); } },
          h('span', { class: 'act-ico' }, icon('calendar', 2)),
          h('span', {}, evTitle(g), h('small', { class: 'act-sub', text: fmtDate(g.event_date) + (same ? ' · ' + t('sameDay') : '') }))));
      });
      pop.body.appendChild(list);
      pop.body.appendChild(h('button', { type: 'button', class: 'act-close', text: t('cancel'), onclick: pop.close }));
    }).catch(function (e) { toast(e.message, true); });
  }
  function mergeInto(ev, gig) {
    confirmSheet(t('mergeConfirm', { inq: evTitle(ev), gig: evTitle(gig) }), t('mergeGo')).then(function (yes) {
      if (!yes) return;
      api('/api/events/' + ev.id, { method: 'PATCH', body: { action: 'merge', into: gig.id } }).then(function () {
        toast(t('mergeDone', { gig: evTitle(gig) }));
        state.tab = 'gigs';
        return refresh().then(function () {
          // An old gig sits outside the default list, so there is no sheet to open for it.
          if (state.events.some(function (e) { return e.id === gig.id; })) openDetail(gig.id);
        });
      }).catch(function (e) { toast(e.message, true); });
    });
  }
  function inquiryActions(ev) {
    return [
      addQuietly(ev),
      mergeAction(ev),
      { label: t('edit'), icon: 'edit', onclick: function () { openEventModal(ev); } },
      { label: t('lapse'), icon: 'clock', onclick: function () { doAction(ev, 'lapse').then(closeDetail); } },
      { label: t('decline'), icon: 'no', cls: 'danger', onclick: function () { doAction(ev, 'decline').then(closeDetail); } },
      { label: t('del'), icon: 'trash', cls: 'danger', onclick: function () { deleteEvent(ev); } },
    ];
  }
  function primaryFor(ev, c) {
    var s = ev.status;
    var canPost = state.me.channels && state.me.channels.groupme;
    var confirmIt = function () {
      confirmSheet(t('confirmAsk'), t('confirmGig'), false, canPost ? { toggle: { label: t('confirmPost'), on: !(ev.quiet && !ev.asked_at) } } : null).then(function (yes) {
        if (yes) doAction(ev, 'confirm', { notify: yes === true || !!yes.toggle });
      });
    };
    var cancelIt = function () {
      confirmSheet(t('cancelAsk'), t('cancelGig'), true, canPost ? { toggle: { label: t('cancelPost'), on: true } } : null).then(function (yes) {
        if (yes) doAction(ev, 'cancel', { notify: !!(yes && yes.toggle) }).then(closeDetail);
      });
    };
    var remind = { label: t('sendReminder'), icon: 'bell', onclick: function () { doAction(ev, 'remind'); } };
    var edit = { label: t('editDetails'), icon: 'edit', onclick: function () { openEventModal(ev); } };
    var out = { primary: null, more: [] };
    if (s === 'inquiry') {
      out.primary = ev.event_date
        ? { label: t('askGroup').replace(/^📢\s*/, ''), icon: 'chat', onclick: function (e) { askGroup(ev, null, e.currentTarget); } }
        : postToTeam(ev);
      out.more = inquiryActions(ev);
    } else if (s === 'open') {
      if (isPast(ev)) out.primary = { label: t('markDone'), icon: 'allDone', cls: 'btn-teal', onclick: function () { doAction(ev, 'done'); } };
      else if (!ev.asked_at || !ev.event_date) out.primary = { label: t('askGroup').replace(/^📢\s*/, ''), icon: 'chat', onclick: function (e) { askGroup(ev, null, e.currentTarget); } };
      else if (c.pending) out.primary = { label: t('sendReminder'), icon: 'bell', onclick: function () { doAction(ev, 'remind'); } };
      else out.primary = { label: t('confirmGig'), icon: 'yes', cls: 'btn-teal', onclick: confirmIt };
      out.more = [
        { label: t('postTally'), icon: 'people', onclick: function () { doAction(ev, 'tally'); } },
        { label: t('postAnnouncement'), icon: 'mail', onclick: function () { doAction(ev, 'announce'); } },
        remind, websiteAction(ev), edit,
        { label: t('confirmGig'), icon: 'yes', onclick: confirmIt },
        { label: t('cancelGig'), icon: 'no', cls: 'danger', onclick: cancelIt },
      ];
    } else if (s === 'confirmed') {
      out.primary = isPast(ev)
        ? { label: t('markDone'), icon: 'allDone', cls: 'btn-teal', onclick: function () { doAction(ev, 'done'); } }
        : { label: t('postConfirmation'), icon: 'chat', onclick: function () { doAction(ev, 'reconfirm'); } };
      out.more = [
        isPast(ev) ? null : remind,
        websiteAction(ev),
        edit,
        { label: t('markDone'), icon: 'allDone', onclick: function () { doAction(ev, 'done'); } },
        { label: t('cancelGig'), icon: 'no', cls: 'danger', onclick: cancelIt },
      ];
    } else if (s === 'done') {
      out.primary = edit;
      out.more = [websiteAction(ev), { label: t('reopen'), icon: 'refresh', onclick: function () { doAction(ev, 'reopen'); } },
        { label: t('del'), icon: 'trash', cls: 'danger', onclick: function () { deleteEvent(ev); } }];
    } else {
      // 'ask' is rejected server-side for a declined/cancelled gig, so reopening is the only way forward.
      out.primary = { label: t('reopen'), icon: 'refresh', onclick: function () { doAction(ev, 'reopen'); } };
      out.more = [
        // Re-sending 'cancel' on a cancelled gig is a no-op transition, so this only posts.
        s === 'cancelled' && canPost ? { label: t('postCancellation'), icon: 'chat', onclick: function () { doAction(ev, 'cancel', { notify: true }); } } : null,
        s === 'lapsed' || s === 'declined' ? mergeAction(ev) : null,
        edit, { label: t('del'), icon: 'trash', cls: 'danger', onclick: function () { deleteEvent(ev); } }];
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

    var facts = factList(ev);
    if (facts) body.appendChild(facts);
    var detailCal = calButton(ev);
    var detailGal = ['open', 'confirmed', 'done'].indexOf(ev.status) !== -1 ? galleryButton(ev) : null;
    if (detailCal || detailGal) body.appendChild(h('div', { class: 'card-actions' }, detailCal, detailGal));
    var siteRow = websiteRow(ev); if (siteRow) body.appendChild(siteRow);

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
    body.appendChild(changesSection(ev));

    var acts = primaryFor(ev, c);
    var foot = h('div', { class: 'foot-btns' },
      h('button', { class: 'btn btn-main ' + (acts.primary.cls || 'btn-gold'), onclick: acts.primary.onclick }, icon(acts.primary.icon, 2), acts.primary.label),
      h('button', { class: 'btn btn-icon', 'aria-label': t('moreActions'), onclick: function () { actionSheet(evTitle(ev), acts.more); } }, icon('more', 2)));

    var title = h('span', { class: 'modal-title' }, pill(ev.status));
    var prev = document.querySelector('#modal-root .modal-body'); var scrollTop = prev ? prev.scrollTop : 0;
    modal(title, body, foot, { cls: 'modal-detail', onclose: closeDetail, noFocus: true });
    var nb = document.querySelector('#modal-root .modal-body'); if (nb && scrollTop) nb.scrollTop = scrollTop;
  }

  // historyUI.last is only a loading placeholder — changesSection always refetches on open, never reads it as a cache.
  var historyUI = { open: {}, last: {}, expanded: {} };
  function fmtWhen(iso) { return new Date(iso).toLocaleString(state.lang === 'es' ? 'es-US' : 'en-US'); }
  function whoLabel(c) {
    if (c.source === 'bot') return t('whoBot', { sender: c.actor || '?' });
    if (c.source === 'family') return c.actor || t('whoSystem');
    if (c.source === 'owner' || c.source === 'merge') return c.actor && c.actor !== 'owner' ? c.actor : t('whoOwner');
    if (c.source === 'undo') return t('whoUndo');
    if (c.source === 'sql') return 'SQL';
    return c.actor || t('whoSystem');
  }
  function statusChip(st) {
    if (!st) return h('span', { class: 'chip chip-xs none', text: t('noAnswer') });
    return h('span', { class: 'chip chip-xs ' + st }, icon(st, 3), t(st));
  }
  function changeLine(c) {
    var who = whoLabel(c), main;
    if (c.kind === 'gig') {
      var key = c.op === 'insert' ? 'changesGigCreated' : c.op === 'delete' ? 'changesGigDeleted' : 'changesGigEdited';
      main = h('div', { class: 'chg-main' }, h('span', { class: 'chg-text', text: t(key, { who: who, fields: (c.changed || []).join(', ').replace(/_/g, ' ') }) }));
    } else {
      main = h('div', { class: 'chg-main' }, h('b', { class: 'chg-name', text: c.dancer_name || '—' }),
        statusChip(c.old_status), h('span', { class: 'chg-arrow', text: '→' }), statusChip(c.new_status));
    }
    var meta = h('div', { class: 'chg-meta', title: fmtWhen(c.changed_at) },
      h('span', { class: 'chg-who', text: who }), h('span', { class: 'chg-time', text: timeAgo(c.changed_at) }));
    var tappable = c.kind === 'answer' && c.message;
    var row = h(tappable ? 'button' : 'div', { type: tappable ? 'button' : null, class: 'chg' + (tappable ? ' chg-tap' : '') + (c.source === 'undo' ? ' chg-undo' : '') },
      h('div', { class: 'chg-body' }, main, meta), tappable ? h('span', { class: 'chg-go' }, icon('chevron', 2.5)) : null);
    if (tappable) row.onclick = function () { openChangeMessage(c); };
    return row;
  }
  function openChangeMessage(c) {
    var pop = popSheet(c.message.sender_name || '?', fmtWhen(c.changed_at));
    pop.body.appendChild(h('p', { class: 'pop-msg', text: c.message.text || '' }));
    if (c.message.undoable) {
      var btn = h('button', { class: 'btn btn-undo', text: t('undoConfirm'),
        onclick: function () { pop.close(); undoBotMessage({ id: c.message.id, result: null }, btn); } });
      pop.body.appendChild(h('div', { class: 'card-actions' }, btn));
    }
  }
  function dayLabel(iso) {
    var d = new Date(iso), today = new Date(); today.setHours(0, 0, 0, 0);
    var days = Math.round((today - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
    if (days === 0) return t('chgToday');
    if (days === 1) return t('chgYesterday');
    var local = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    return fmtDateShort(local);
  }
  function renderChangesList(container, changes, evId) {
    container.innerHTML = '';
    var expanded = historyUI.expanded[evId];
    var shown = expanded ? changes : changes.slice(0, 10);
    var list = h('div', { class: 'chg-list' }); container.appendChild(list);
    var lastDay = null;
    shown.forEach(function (c) {
      var day = dayLabel(c.changed_at);
      if (day !== lastDay) { list.appendChild(h('div', { class: 'chg-day', text: day })); lastDay = day; }
      list.appendChild(changeLine(c));
    });
    if (!expanded && changes.length > 10) {
      container.appendChild(h('button', { class: 'btn btn-sm chg-more', text: t('changesMore') + ' · ' + changes.length, onclick: function () {
        historyUI.expanded[evId] = true;
        renderChangesList(container, changes, evId);
      } }));
    }
  }
  function changesSection(ev) {
    var box = h('div', { class: 'tm-fold-body' });
    var loading = false, errMsg = null, loaded = null;
    function paint() {
      box.innerHTML = '';
      var placeholder = loaded || (loading ? historyUI.last[ev.id] : null);
      if (placeholder && placeholder.length) renderChangesList(box, placeholder, ev.id);
      if (loading) box.appendChild(h('p', { class: 'hint', text: t('changesLoading') }));
      else if (errMsg) box.appendChild(h('div', {},
        h('p', { class: 'hint', text: errMsg }),
        h('button', { class: 'btn btn-sm', text: t('tryAgain'), onclick: fetchHistory })));
      else if (loaded && !loaded.length) box.appendChild(h('p', { class: 'hint', text: t('changesEmpty') }));
    }
    function fetchHistory() {
      loading = true; errMsg = null; loaded = null; paint();
      api('/api/events/' + ev.id + '?history=1').then(function (d) {
        loading = false; loaded = d.changes; historyUI.last[ev.id] = d.changes; paint();
      }).catch(function (e) {
        loading = false; errMsg = e.message; paint();
      });
    }
    var sec = section(t('changesTitle'));
    sec.className += ' tm-sec-fold';
    var det = h('details', { class: 'tm-fold', ontoggle: function () {
      historyUI.open[ev.id] = det.open;
      if (det.open) fetchHistory();
    } }, h('summary', { class: 'tm-fold-summary' }, sec), box);
    det.open = !!historyUI.open[ev.id];
    if (det.open) fetchHistory();
    return det;
  }

  /* ── group events (potlucks, posadas): RSVPs + potluck live in team/party.js ── */
  var GKINDS = ['potluck', 'posada', 'party', 'practice', 'meeting', 'outing', 'fundraiser', 'other'];
  function isGathering(ev) { return ev && ev.status === 'gathering'; }
  function upcomingGatherings() {
    return state.events.filter(function (e) { return isGathering(e) && !isPast(e); })
      .sort(function (a, b) { return (a.event_date || '').localeCompare(b.event_date || '') || a.id - b.id; });
  }
  function pastGatherings() { return state.events.filter(function (e) { return isGathering(e) && isPast(e); }).sort(newestFirst); }
  function gatherRow(ev) {
    var p = ev.party || {}, owner = isOwner(), past = isPast(ev);
    var when = [fmtTime(ev), ev.venue].filter(Boolean).join(' · ');
    var mine = p.mine;
    var side = owner || past
      ? h('span', { class: 'evrow-count' }, h('b', { text: p.people || 0 }), h('span', { text: t('eventGoing', { n: '' }).trim() }))
      : mine ? h('span', { class: 'evrow-me is-' + mine }, icon(mine, 3), t(mine === 'yes' ? 'youGoingShort' : mine === 'maybe' ? 'youMaybeShort' : 'youNoShort'))
      : h('span', { class: 'evrow-cta', text: t('eventRsvp') });
    var foot = [];
    if (!owner && !past && p.people) foot.push(t('eventGoing', { n: p.people }));
    if (ev.potluck && p.needed) foot.push(t('potluckShort', { c: p.claimed, n: p.needed }));
    return h('button', { type: 'button', class: 'evrow' + (past ? ' is-past' : '') + (!owner && !past && !mine ? ' is-ask' : ''), id: 'event-' + ev.id,
      'aria-label': evTitle(ev), onclick: function () { openParty(ev.id); } },
      dateBox(ev),
      h('span', { class: 'evrow-main' },
        h('span', { class: 'evrow-kind', text: t('gkinds')[ev.event_type] || t('groupEvents') }),
        h('b', { class: 'evrow-title', text: evTitle(ev) }),
        when ? h('span', { class: 'evrow-meta', text: when }) : null,
        foot.length ? h('span', { class: 'evrow-foot', text: foot.join(' · ') }) : null),
      side,
      h('span', { class: 'giggo' }, icon('chevron', 2.5)));
  }
  function gatherSection(withPast) {
    var list = upcomingGatherings(), owner = isOwner();
    if (!list.length && !owner) return;
    app.appendChild(section(t('groupEvents'), list.length || null, owner
      ? h('button', { type: 'button', class: 'btn btn-sm btn-icon btn-gold sec-add', 'aria-label': t('newEvent'), title: t('newEvent'),
        onclick: function () { gatheringForm(null); } }, icon('plus', 2.5)) : null));
    if (owner) app.appendChild(h('p', { class: 'tm-sub', text: t('groupEventsSub') }));
    if (list.length) app.appendChild(h('div', { class: 'evlist' }, list.map(gatherRow)));
    else app.appendChild(h('button', { type: 'button', class: 'evempty', onclick: function () { gatheringForm(null); } },
      icon('plus', 2.2), h('span', { text: t('noEvents') }), h('b', { text: t('newEvent') })));
    var past = withPast ? pastGatherings() : [];
    if (past.length) {
      var sec = section(t('pastEvents'), past.length);
      sec.className += ' tm-sec-fold';
      app.appendChild(h('details', { class: 'tm-fold' }, h('summary', { class: 'tm-fold-summary' }, sec), h('div', { class: 'evlist' }, past.map(gatherRow))));
    }
  }
  function newSomethingSheet() {
    actionSheet(t('newWhat'), [
      { label: t('addGig'), icon: 'calendar', onclick: function () { openEventModal(null); } },
      { label: t('addEvent'), icon: 'people', onclick: function () { gatheringForm(null); } },
    ]);
  }

  function gatheringForm(ev, after) {
    ev = ev || {};
    var isNew = !ev.id;
    var kind = ev.event_type && GKINDS.indexOf(ev.event_type) !== -1 ? ev.event_type : 'potluck';
    var potluck = isNew ? true : !!ev.potluck;
    var kinds = h('div', { class: 'frow gkinds', role: 'radiogroup', 'aria-label': t('eventKind') });
    function paintKinds() {
      kinds.innerHTML = '';
      GKINDS.forEach(function (k) {
        kinds.appendChild(h('button', { type: 'button', role: 'radio', 'aria-checked': kind === k ? 'true' : 'false', class: 'fchip' + (kind === k ? ' is-on' : ''),
          text: t('gkinds')[k], onclick: function () { kind = k; if (isNew) setPotluck(k === 'potluck' || k === 'posada' || k === 'party'); paintKinds(); } }));
      });
    }
    var potRow = h('button', { type: 'button', class: 'pop-toggle full', role: 'switch', onclick: function () { setPotluck(!potluck); } },
      icon('people', 2.2), h('span', { class: 'site-label', text: t('potluckToggle') }), h('span', { class: 'switch' }));
    function setPotluck(on) { potluck = on; potRow.classList.toggle('is-on', on); potRow.setAttribute('aria-checked', on ? 'true' : 'false'); }
    setPotluck(potluck); paintKinds();
    var err = h('p', { class: 'error' });
    function done() { closeModal(); if (after) after(); }
    var form = h('form', { class: 'form-grid', id: 'gathering-form', onsubmit: function (e) {
      e.preventDefault(); err.textContent = '';
      var fd = new FormData(form), body = { event_type: kind, potluck: potluck };
      fd.forEach(function (v, k) { body[k] = v; });
      // Suggestions live in the potluck card, so writing them turns the potluck on.
      if (String(body.potluck_notes || '').trim()) body.potluck = true;
      if (!String(body.title || '').trim()) { err.textContent = t('needTitle'); return; }
      if (!body.event_date) { err.textContent = t('needEventDate'); return; }
      var req = isNew ? api('/api/events', { method: 'POST', body: Object.assign({ status: 'gathering' }, body) })
        : api('/api/events/' + ev.id, { method: 'PATCH', body: body });
      req.then(function (r) {
        closeModal(); toast(t('saved'));
        return refresh().then(function () { openParty(isNew ? r.id : ev.id); });
      }).catch(function (x) { err.textContent = x.message; });
    } },
      field(t('title'), inp('title', ev, { placeholder: t('eventTitlePh'), required: true, maxlength: 300 }), true, true),
      h('div', { class: 'f full gkinds-field' }, h('span', { class: 'f-label', text: t('eventKind') }), kinds),
      field(t('dateLabel'), inp('event_date', ev, { type: 'date', required: true }), false, true),
      field(t('startTime'), inp('start_time', ev, { placeholder: '4:00 PM' })),
      field(t('endTime'), inp('end_time', ev, { placeholder: '9:00 PM' })),
      field(t('eventWhere'), inp('venue', ev, { placeholder: t('eventWherePh') })),
      field(t('city'), inp('city', ev, { placeholder: 'Hacienda Heights' })),
      field(t('address'), inp('address', ev, {}), true),
      field(t('eventDetails'), h('textarea', { name: 'details', text: ev.details || '', placeholder: t('eventDetailsPh') }), true),
      potRow,
      field(t('potluckNotes'), h('textarea', { name: 'potluck_notes', text: ev.potluck_notes || '', placeholder: t('potluckNotesPh') }), true),
      h('div', { class: 'full' }, err));
    var foot = h('div', { class: 'foot-btns' },
      h('button', { class: 'btn btn-gold btn-main', type: 'submit', form: 'gathering-form', text: isNew ? t('create') : t('save') }),
      h('button', { class: 'btn', type: 'button', text: t('cancel'), onclick: done }));
    modal(isNew ? t('modalNewEvent') : t('modalEditEvent'), form, foot, { onclose: done });
  }

  var partyUI = null, partyLoad = null;
  function loadPartyScript() {
    if (window.BFMHParty) return Promise.resolve();
    if (!partyLoad) {
      partyLoad = new Promise(function (ok, fail) {
        document.head.appendChild(h('link', { rel: 'stylesheet', href: '/team/party.css' }));
        var js = h('script', { src: '/team/party.js' }); js.onload = ok; js.onerror = function () { partyLoad = null; fail(new Error('Could not load the event')); };
        document.head.appendChild(js);
      });
    }
    return partyLoad;
  }
  function inviteUrl(id, sig) { return location.origin + '/e/' + id + '/' + sig; }
  function shareParty(ev, sig) {
    var url = inviteUrl(ev.id, sig), text = t('eventShareMsg', { title: evTitle(ev) });
    if (navigator.share) return navigator.share({ title: evTitle(ev), text: text, url: url }).catch(function () {});
    return copyText(url);
  }
  function openParty(id) {
    closeParty(true);
    var ev = state.events.filter(function (e) { return e.id === id; })[0];
    var body = h('div', { class: 'gal-body party-body' }, loader(t('loadingEvent')));
    var menu = isOwner() ? h('button', { type: 'button', class: 'btn btn-sm btn-icon', 'aria-label': t('eventMenu'), onclick: function () { partyMenu(); } }, icon('more', 2)) : null;
    var root = h('div', { class: 'gal party-layer', role: 'dialog', 'aria-modal': 'true' },
      h('header', { class: 'gal-head' },
        h('button', { type: 'button', class: 'btn btn-sm btn-icon', 'aria-label': t('close'), onclick: function () { closeParty(); } }, icon('back', 2.2)),
        h('div', { class: 'gal-title' }, h('b', { text: ev ? evTitle(ev) : t('groupEvents') }), h('span', { class: 'card-meta', text: ev && ev.event_date ? fmtDate(ev.event_date) : '' })),
        h('span', { class: 'lb-spacer' }), menu),
      body);
    partyUI = { id: id, root: root, ctl: null, dirty: false };
    var mine = partyUI;
    document.body.appendChild(root);
    document.body.classList.add('has-gal');
    try { history.pushState({ party: id }, ''); mine.pushed = true; } catch (e) {}
    track('party', id);
    loadPartyScript().then(function () {
      if (partyUI !== mine) return;
      body.innerHTML = '';
      mine.ctl = window.BFMHParty.mount(body, { id: id, lang: state.lang, embedded: true, toast: toast,
        onChange: function () { mine.dirty = true; },
        onFlyer: isOwner() ? function (e) { pickFlyer(e.id); } : null,
        onAnnounce: isOwner() ? function (e, again) { announceParty(e, again); } : null,
        onGallery: function (e) { openGallery(e.id); } });
    }, function (e) { toast(e.message, true); closeParty(); });
  }
  function closeParty(silent) {
    if (!partyUI) return;
    var p = partyUI; partyUI = null;
    p.root.remove();
    if (!gal) document.body.classList.remove('has-gal');
    if (p.pushed && !silent && history.state && history.state.party === p.id) history.back();
    if (p.dirty) loadEvents().then(render).catch(function () {});
  }
  function announceParty(ev, again) {
    return api('/api/events/' + ev.id, { method: 'PATCH', body: { action: again ? 'remind' : 'announce' } }).then(function (d) {
      var posted = d.notified && d.notified.groupme;
      toast(posted ? t('eventPosted') : t('postFailed'), !posted);
      if (partyUI && partyUI.id === ev.id && partyUI.ctl) { partyUI.dirty = true; partyUI.ctl.reload(); }
    }).catch(function (e) { toast(e.message, true); });
  }
  function partyMenu() {
    var p = partyUI; if (!p) return;
    var d = p.ctl && p.ctl.data();
    var ev = (d && d.event) || state.events.filter(function (e) { return e.id === p.id; })[0];
    if (!ev) return;
    var sig = d && d.sig, posted = Boolean(d && d.announced);
    actionSheet(evTitle(ev), [
      !isPast(ev) ? { label: t(posted ? 'remindEvent' : 'announceEvent'), icon: 'chat', onclick: function () { announceParty(ev, posted); } } : null,
      sig ? { label: t('shareEvent'), icon: 'share', onclick: function () { shareParty(ev, sig); } } : null,
      sig && navigator.share ? { label: t('copyEventLink'), icon: 'link', onclick: function () { copyText(inviteUrl(ev.id, sig)); } } : null,
      { label: t('editEvent'), icon: 'edit', onclick: function () {
        var full = state.events.filter(function (e) { return e.id === ev.id; })[0] || ev;
        closeParty(); gatheringForm(full, function () { openParty(ev.id); });
      } },
      { label: t(ev.flyer ? 'changeFlyer' : 'addFlyer'), icon: 'image', onclick: function () { pickFlyer(ev.id); } },
      ev.flyer ? { label: t('removeFlyer'), icon: 'trash', onclick: function () {
        confirmSheet(t('removeFlyerAsk', { title: evTitle(ev) }), t('remove'), true).then(function (yes) {
          if (yes) flyerApi({ action: 'flyer_clear', event_id: ev.id }, t('flyerRemoved'));
        });
      } } : null,
      ev.gallery_open || ev.media_count ? { label: t('gallery'), icon: 'image', onclick: function () { openGallery(ev.id); } } : null,
      { label: t('deleteEvent'), icon: 'trash', cls: 'danger', onclick: function () {
        confirmSheet(t('deleteEventAsk', { title: evTitle(ev) }), t('del'), true).then(function (yes) {
          if (!yes) return;
          api('/api/events/' + ev.id, { method: 'DELETE' }).then(function () { toast(t('deleted')); closeParty(); return refresh(); })
            .catch(function (e) { toast(e.message, true); });
        });
      } },
    ]);
  }

  function flyerApi(body, okMsg) {
    return api('/api/media', { method: 'POST', body: body }).then(function () {
      toast(okMsg);
      if (partyUI && partyUI.id === body.event_id && partyUI.ctl) partyUI.ctl.reload();
    }).catch(function (e) { toast(e.message, true); });
  }
  function pickFlyer(id) {
    var input = h('input', { type: 'file', accept: 'image/*', style: 'display:none' });
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      input.remove();
      if (!file) return;
      if (!/^image\//.test(file.type)) { toast(t('flyerNotImage'), true); return; }
      toast(t('flyerUploading'));
      shrinkPhoto(file).catch(function () { return { blob: file }; }).then(function (p) {
        return api('/api/media', { method: 'POST', body: { action: 'flyer', event_id: id, name: file.name, type: p.blob.type || file.type, size: p.blob.size } })
          .then(function (r) { return putFile(r.put, p.blob).then(function () { return r.key; }); })
          .then(function (key) { return flyerApi({ action: 'flyer_set', event_id: id, key: key, width: p.width, height: p.height }, t('flyerSaved')); });
      }).catch(function (e) { toast(e.message, true); });
    });
    document.body.appendChild(input);
    input.click();
  }

  /* ── gallery & music ───────────────────────────────────── */
  var media = { index: null, library: null, videos: null, loading: null, open: {}, danceSort: 'most', danceRegion: null, galKind: 'all' };
  try { var gk = localStorage.getItem('bfmh_team_gal_kind'); if (gk === 'gig' || gk === 'event') media.galKind = gk; } catch (e) {}
  try { if (localStorage.getItem('bfmh_team_dance_sort') === 'az') media.danceSort = 'az'; media.danceRegion = localStorage.getItem('bfmh_team_dance_region'); } catch (e) {}
  /* Videos are matched to a dance by title ("Jarabe Tapatío - Arcadia Elks 5/8/26"); aliases catch spellings in use. */
  var DANCES = [
    ['Jarabe Tapatío', 'jarabe'], ['El Son de la Negra', 'son de la negra', 'la negra'], ['La Chona'], ['El Potro'],
    ['Tranchete', 'tranchete', 'tranchette'], ['Colas'], ['Zapateado'], ['El Huateque', 'huateque', 'guateque'],
    ['La Llorona'], ['Las Calaveras'], ['La Bruja'], ['Chumbala Cachumbala', 'chumbala'], ['Santa Rita'], ['Jesusita'],
    ['Evangelina'], ['El Circo', 'circo'], ['La Botella', 'botella', 'botela'], ['Relámpago'], ['Fantasía', 'fantasia', 'fantacia'],
    ['Espejeando'], ['María Chuchena'], ['La Raspa'], ['Rascapetate', 'rascapetate', 'rescapetate'], ['El Toro Mambo', 'toro mambo'],
    ['Baile de los Viejitos', 'viejitos'], ['Charolas'], ['Sonajas'], ['El Sauce y la Palma', 'sauce y la palma'], ['Acuérdate'],
    ['El Sapo y la Rana', 'sapo y la rana'], ['Chiapanecas'], ['Vaquería'], ['El Mariachi'], ['Un Poco Loco']
  ].map(function (d) {
    var names = (d.length > 1 ? d.slice(1) : [d[0]]).map(fold);
    return { name: d[0], re: new RegExp('(^|[^a-z])(' + names.join('|') + ')(?![a-z])') };
  });
  /* Regions follow the costumes and the owners' lineups ("Sinaloa 1. Sauce 2. Acuérdate · Jalisco 3. Tranchete…"). */
  var REGIONS = [
    ['Jalisco', 'Jarabe Tapatío', 'El Son de la Negra', 'La Botella', 'Tranchete', 'La Raspa', 'Relámpago', 'El Mariachi', 'Un Poco Loco'],
    ['Veracruz', 'Colas', 'Zapateado', 'El Huateque', 'La Bruja'],
    ['Chiapas', 'Rascapetate', 'Chiapanecas', 'La Llorona', 'Las Calaveras', 'Chumbala Cachumbala'],
    ['Sinaloa', 'Acuérdate', 'El Sauce y la Palma', 'El Toro Mambo'],
    ['El Norte', 'Santa Rita', 'Evangelina', 'El Circo', 'Jesusita', 'Rio'],
    ['Baja', 'El Potro', 'La Chona', 'María Chuchena', 'Espejeando'],
    ['Michoacán', 'Baile de los Viejitos', 'Sonajas', 'Fantasía', 'El Sapo y la Rana'],
    ['Yucatán', 'Charolas', 'Vaquería']
  ];
  var regionByDance = {};
  REGIONS.forEach(function (r) { r.slice(1).forEach(function (d) { regionByDance[fold(d)] = r[0]; }); });
  function regionOf(dance) { return regionByDance[fold(dance)] || null; }
  function fold(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' '); }
  /* The dance named earliest in the title wins. */
  function knownDance(it) {
    var title = fold(it.title), best = null, at = Infinity;
    DANCES.forEach(function (d) { var m = d.re.exec(title); if (m && m.index < at) { at = m.index; best = d.name; } });
    return best;
  }
  /* A dance missing from DANCES is read off the title's lead: "Dance - Gig" or "Dance 10/20/24 …". */
  function guessDance(it) {
    if (it.event_type === 'team') return null;
    var title = String(it.title || '').replace(/\s+/g, ' ').trim();
    var cut = /\s+-\s*|\s*[—–]\s*|\s+(?=\d{1,2}\/\d)|\s+#/.exec(title);
    if (!cut || !cut.index) return null;
    var name = title.slice(0, cut.index).replace(/\s*\(\d+\)$/, '').replace(/\s+(pt\.?\s*\d+|from\s.+)$/i, '').trim();
    if (!name || /\d/.test(name) || name.split(' ').length > 5 || /^(intro|audience participation)\b|\b(clip|playlist|demonstration)\b/i.test(name)) return null;
    return it.event_title && fold(it.event_title).indexOf(fold(name)) !== -1 ? null : name;
  }
  var danceMemo = { list: null, byId: null };
  function danceOf(it) {
    var list = media.videos || [];
    if (danceMemo.list !== list) {
      var byId = {}, spellings = {};
      list.forEach(function (v) {
        var known = knownDance(v);
        if (known) { byId[v.id] = known; return; }
        var guess = guessDance(v);
        if (!guess) return;
        var key = fold(guess), seen = spellings[key] = spellings[key] || {};
        seen[guess] = (seen[guess] || 0) + 1;
        byId[v.id] = key;
      });
      Object.keys(byId).forEach(function (id) {
        var seen = spellings[byId[id]];
        if (seen) byId[id] = Object.keys(seen).sort(function (a, b) { return seen[b] - seen[a]; })[0];
      });
      danceMemo = { list: list, byId: byId };
    }
    return danceMemo.byId[it.id] || null;
  }
  /* UI only: websiteFlags in api/_lib/media.js is what keeps families to suggesting. */
  function isOwner() { return state.me && state.me.role === 'admin'; }
  function setWebsite(it, on) {
    return api('/api/media?id=' + it.id, { method: 'PATCH', body: { website: on } }).then(function (d) {
      it.website = d.item.website; it.suggested = d.item.suggested;
      toast(it.website ? t('webOn') : it.suggested ? t('webSuggested') : t('webOff')); reloadMedia();
    }).catch(function (e) { toast(e.message, true); });
  }
  function webState(it) { return it.website ? 'on' : it.suggested ? 'suggested' : 'off'; }
  function webLabel(it) {
    var st = webState(it);
    if (st === 'on') return t('webHide');
    if (st === 'suggested') return isOwner() ? t('webApprove') : t('webWithdraw');
    return isOwner() ? t('webShow') : t('webSuggest');
  }
  function webShortLabel(it) {
    var st = webState(it);
    if (st === 'on') return t('lbHide');
    if (st === 'suggested') return isOwner() ? t('approve') : t('lbWithdraw');
    return isOwner() ? t('lbShow') : t('lbSuggest');
  }
  function webToggle(it) { return setWebsite(it, isOwner() ? !it.website : !(it.website || it.suggested)); }
  function mediaWebAction(it) {
    if (!it.can_edit || it.noWeb || it.kind === 'audio' || (it.kind === 'photo' && !it.thumb)) return null;
    return { label: webLabel(it), icon: 'globe', onclick: function () { webToggle(it); } };
  }
  function webBadge(it) {
    var st = webState(it);
    var label = t(st === 'on' ? 'webBadge' : 'webPending');
    return st === 'off' ? null : h('span', { class: 'tile-web is-' + st, title: label, 'aria-label': label, role: 'img' }, icon(st === 'on' ? 'yes' : 'clock', 2.6));
  }
  var gal = null;
  function plural(n, one, many) { return t(n === 1 ? one : many, { n: n }); }
  function fmtBytes(b) { return b >= 1073741824 ? (b / 1073741824).toFixed(1) + ' GB' : Math.max(1, Math.round(b / 1048576)) + ' MB'; }
  function whoOf(it) {
    return it.credit || (!it.uploader || it.uploader === 'owners' ? t('theOwners')
      // "Cindy (Zamyra & Zaryna)" names people, not a surname, so it can't take "the … family".
      : /\(/.test(it.uploader) ? it.uploader : t('theFamily', { name: it.uploader }));
  }
  function addedBy(it) { return t('addedBy', { who: whoOf(it) }); }
  /* iOS can paint a cancelled load half-drawn: hide until decoded, and let a repaint reuse the
     in-flight <img>, keyed without the signed query since that rotates. */
  var thumbPool = {}, thumbRoots = [], POOL_MAX = 300;
  function thumbImg(src, full) {
    var key = src.split('?')[0];
    var img = thumbPool[key];
    // claimed: the tree being built isn't in the document yet, so isConnected misses a repeat in this paint
    if (img && (img.isConnected || img.claimed || img.classList.contains('is-failed'))) img = null;
    if (img && img.dataset.src !== src && !img.classList.contains('is-loaded')) img = null;
    if (!img) {
      img = h('img', { alt: '', class: 'thumb', decoding: 'async' });
      img.dataset.src = src; img.tries = 0; img.full = !!full;
      delete thumbPool[key];
      thumbPool[key] = img;
      prunePool();
    }
    img.claimed = true;
    queueMicrotask(function () { img.claimed = false; if (!img.getAttribute('src')) watchThumb(img); });
    return img;
  }
  /* rootMargin only reaches past the viewport, so observe against the box that actually scrolls. */
  function watchThumb(img) {
    if (img.io) { img.io.unobserve(img); img.io = null; }
    if (!img.isConnected) return;
    if (!('IntersectionObserver' in window)) return startThumb(img);
    var root = img.parentElement;
    while (root && root !== document.body && !/(auto|scroll)/.test(getComputedStyle(root).overflowY)) root = root.parentElement;
    if (root === document.body) root = null;
    var hit = thumbRoots.filter(function (r) { return r.root === root; })[0];
    if (!hit) {
      hit = { root: root, io: new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { hit.io.unobserve(en.target); en.target.io = null; startThumb(en.target); } });
      }, { root: root, rootMargin: '600px 0px' }) };
      thumbRoots = thumbRoots.filter(function (r) { return !r.root || r.root.isConnected; }).concat(hit);
    }
    img.io = hit.io; hit.io.observe(img);
  }
  function prunePool() {
    var keys = Object.keys(thumbPool), extra = keys.length - POOL_MAX;
    for (var i = 0; extra > 0 && i < keys.length; i++) {
      if (!thumbPool[keys[i]].isConnected) { delete thumbPool[keys[i]]; extra--; }
    }
  }
  function startThumb(img) {
    clearTimeout(img.stall);
    img.onload = function () {
      clearTimeout(img.stall);
      if (!img.naturalWidth) return retryThumb(img);
      (img.decode ? img.decode() : Promise.resolve()).catch(function () {}).then(function () { img.classList.add('is-loaded'); });
    };
    img.onerror = function () { retryThumb(img); };
    // An original (no thumb) can be 25 MB, so only small thumbs get the stall watchdog.
    if (!img.full) img.stall = setTimeout(function () { retryThumb(img); }, 45000);
    img.src = img.dataset.src;
  }
  function retryThumb(img) {
    clearTimeout(img.stall);
    if (img.classList.contains('is-loaded')) return;
    if (++img.tries > 3) {
      img.classList.add('is-failed');
      if (img.parentNode) img.parentNode.insertBefore(h('span', { class: 'thumb-fail' }, icon('image', 1.5)), img.nextSibling);
      return;
    }
    img.removeAttribute('src');
    setTimeout(function () { startThumb(img); }, 1500 * img.tries * img.tries);
  }
  function loadMediaIndex() {
    if (!media.loading) {
      media.loading = Promise.all([api('/api/media'), api('/api/media?library=1'), api('/api/media?videos=1')]).then(function (r) {
        media.index = r[0]; media.library = r[1].songs; media.videos = r[2].videos; media.loading = null;
        media.videos.forEach(function (v) { if (v.event_status === 'gathering') v.noWeb = true; });
      }, function (e) { media.loading = null; throw e; });
    }
    return media.loading;
  }
  function galleryButton(ev) {
    if (!ev.gallery_open && !(isOwner() && ev.media_count)) return null;
    var n = ev.media_count || 0;
    return h('button', { type: 'button', class: 'btn btn-sm', onclick: function () { openGallery(ev.id); } },
      icon('image', 2), n ? t('galleryN', { n: n }) : t('gallery'));
  }

  function renderMediaTab() {
    if (!media.index) {
      app.appendChild(loader(t('mediaLoading')));
      loadMediaIndex().then(render, function (e) { toast(e.message, true); });
      return;
    }
    var idx = media.index;
    if (!idx.storage) app.appendChild(h('div', { class: 'card' }, h('p', { class: 'card-meta', text: t('storageOff') })));
    if (idx.usage && !FAMILIA) {
      var pct = Math.min(100, Math.round(idx.usage.used / idx.usage.quota * 100));
      app.appendChild(h('div', { class: 'card quiet storage' },
        h('div', { class: 'storage-line' }, h('span', { class: 'tm-label', text: t('storageLabel') }),
          h('span', { class: 'card-meta', text: t('storageUsed', { used: fmtBytes(idx.usage.used), quota: fmtBytes(idx.usage.quota) }) })),
        h('div', { class: 'meter' }, h('i', { style: 'flex:' + pct + ';background:' + (pct > 85 ? 'var(--no)' : 'var(--gold)') }), h('i', { style: 'flex:' + (100 - pct) }))));
    }
    if (idx.review && idx.review.length) renderReview(idx.review);

    renderDances();
    renderMusic(idx.storage);

    var galKind = media.galKind;
    var hasEvents = idx.gigs.some(function (g) { return g.kind === 'event'; });
    if (!hasEvents) galKind = 'all';
    var galShown = galKind === 'all' ? idx.gigs : idx.gigs.filter(function (g) { return g.kind === galKind; });
    var setGalKind = function (k) { media.galKind = k; try { localStorage.setItem('bfmh_team_gal_kind', k); } catch (e) {} render(); };
    foldSection('gigs', t('gigGalleries'), idx.gigs.length, true,
      isOwner() ? h('button', { type: 'button', class: 'btn btn-sm btn-icon btn-gold sec-add', 'aria-label': t('newFolder'), title: t('newFolder'),
        onclick: function (e) { e.preventDefault(); e.stopPropagation(); folderSheet(null); } }, icon('plus', 2.5)) : null,
      hasEvents ? h('div', { class: 'frow gal-kinds' }, h('span', { class: 'flabel', text: t('showLabel') }),
        chip(t('galAll'), galKind === 'all', function () { setGalKind('all'); }),
        chip(t('galGigs'), galKind === 'gig', function () { setGalKind('gig'); }),
        chip(t('galEvents'), galKind === 'event', function () { setGalKind('event'); })) : null,
      !idx.gigs.length ? emptyState('image', t('noGalleryGigs'))
      : !galShown.length ? emptyState('image', t('noGalleryMatch'))
      : h('div', { class: 'galgrid' }, galShown.map(function (g) {
        var counts = [g.photos ? plural(g.photos, 'photoOne', 'photoMany') : null, g.videos ? plural(g.videos, 'videoOne', 'videoMany') : null]
          .filter(Boolean).join(' · ');
        return h('button', { type: 'button', class: 'galcard', onclick: function () { openGallery(g.id); } },
          h('span', { class: 'galcard-cover' + (g.cover ? '' : ' is-empty') }, g.cover ? thumbImg(g.cover) : icon('image', 1.5),
            g.kind === 'event' ? h('span', { class: 'galcard-tag', text: t('galEventTag') }) : null),
          h('span', { class: 'galcard-text' },
            h('b', { text: evTitle(g) }),
            g.event_date || g.status !== 'folder' ? h('span', { class: 'card-meta', text: g.event_date ? fmtDate(g.event_date) : t('dateTbd') }) : null,
            h('span', { class: 'galcard-counts', text: counts || t('nothingYet') })));
      })));

  }

  /* ── feed: uploads and gig/event posts; inquiries and availability stay out ── */
  var FEED_KEY = 'bfmh_team_feed_seen';
  function feedSeen() {
    try { var v = localStorage.getItem(FEED_KEY); if (v) return v; } catch (e) {}
    return new Date(Date.now() - 7 * 864e5).toISOString().replace('Z', '000Z');
  }
  // Fixed for the visit, so cards stay marked New after the Feed tab marks them seen.
  media.feedPrev = feedSeen();
  function loadFeedCount() {
    return api('/api/media?feed=1&since=' + encodeURIComponent(feedSeen())).then(function (d) { state.feedFresh = d.fresh; }, function () {});
  }
  function markFeedSeen() {
    var b = media.feed && media.feed.batches[0];
    state.feedFresh = 0;
    if (!b) return;
    // The server's timestamp, so a phone with a wrong clock can't hide or replay posts.
    try { if (b.stamp > (localStorage.getItem(FEED_KEY) || '')) localStorage.setItem(FEED_KEY, b.stamp); } catch (e) {}
  }
  function feedBadge() {
    var n = state.feedFresh;
    return n && !isFeedTab() ? h('span', { class: 'count', text: n > 99 ? '99+' : n, 'aria-label': t('feedNew') + ': ' + n }) : null;
  }
  function isFresh(b) { return !b.mine && b.stamp > media.feedPrev; }
  function feedWhen(iso) {
    if (Date.now() - new Date(iso).getTime() < 7 * 864e5) return timeAgo(iso);
    var d = new Date(iso);
    return fmtDateShort(d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2));
  }
  function feedWhat(b) {
    var c = { photo: 0, video: 0, audio: 0 };
    b.items.forEach(function (it) { c[it.kind === 'link' ? 'video' : it.kind]++; });
    return [c.photo ? plural(c.photo, 'photoOne', 'photoMany') : null, c.video ? plural(c.video, 'videoOne', 'videoMany') : null,
      c.audio ? plural(c.audio, 'songOne', 'songMany') : null].filter(Boolean).join(t('feedAnd'));
  }
  var FEED_TILES = 6;
  var BLASTS = { 'new': ['blastNew', 'bell'], ask: ['blastAsk', 'clock'], confirmed: ['blastConfirmed', 'yes'], cancelled: ['blastCancelled', 'no'], gathering: ['blastGathering', 'people'], gathering_ask: ['blastGatheringAsk', 'clock'] };
  function openFeedEvent(id) {
    var ev = state.events.find(function (e) { return e.id === id; });
    if (!ev) return;
    if (isGathering(ev)) { openParty(id); return; }
    if (isOwner()) { state.tab = 'gigs'; openDetail(id); return; }
    state.focusEvent = id; render();
  }
  function blastCard(b) {
    var ev = b.event, k = BLASTS[b.blast] || BLASTS['new'];
    // The calendar copy, so a renamed or moved gig reads as it is now.
    var live = state.events.find(function (e) { return e.id === ev.id; }) || ev;
    var open = state.events.some(function (e) { return e.id === ev.id; });
    var where = [fmtTime(live), fmtWhere(live)].filter(Boolean).join(' · ');
    return h(open ? 'button' : 'article', { type: open ? 'button' : null, class: 'feed-card feed-blast is-' + b.blast + (isFresh(b) ? ' is-new' : ''),
      onclick: open ? function () { openFeedEvent(ev.id); } : null },
      h('span', { class: 'feed-head' },
        h('span', { class: 'feed-line feed-kind' }, icon(k[1], 2.5), h('b', { text: t(k[0]) })),
        isFresh(b) ? h('span', { class: 'feed-new', text: t('feedNew') }) : null,
        h('span', { class: 'feed-time', text: feedWhen(b.at) })),
      h('span', { class: 'feed-gig' }, dateBox(live),
        h('span', { class: 'feed-gig-main' },
          h('span', { class: 'card-title sm', text: evTitle(live) }),
          where ? h('span', { class: 'card-meta', text: where }) : null),
        open ? h('span', { class: 'giggo' }, icon('chevron', 2.5)) : null));
  }
  function feedCard(b) {
    if (b.blast) return blastCard(b);
    var who = whoOf(b);
    var songs = b.items.filter(function (i) { return i.kind === 'audio'; });
    var vis = b.items.filter(function (i) { return i.kind !== 'audio'; });
    if (b.event && isGathering(b.event)) vis.forEach(function (i) { i.noWeb = true; });
    var viewable = vis.filter(function (i) { return i.kind !== 'link' || i.youtube; });
    var cut = vis.length > FEED_TILES ? FEED_TILES - 1 : FEED_TILES;
    var openFolder = b.event ? function () { openGallery(b.event.id); } : null;
    var tiles = vis.slice(0, cut).map(function (it) { return mediaTile(it, viewable); });
    if (vis.length > cut) tiles.push(h('button', { type: 'button', class: 'photo feed-rest', onclick: openFolder },
      h('b', { text: '+' + (vis.length - cut) }), h('span', { text: t('feedMore') })));
    var ev = b.event;
    return h('article', { class: 'feed-card' + (isFresh(b) ? ' is-new' : '') },
      h('div', { class: 'feed-head' },
        h('p', { class: 'feed-line' }, h('b', { text: who.charAt(0).toUpperCase() + who.slice(1) }), ' ' + t('feedAdded', { what: feedWhat(b) })),
        isFresh(b) ? h('span', { class: 'feed-new', text: t('feedNew') }) : null,
        h('span', { class: 'feed-time', text: feedWhen(b.at) })),
      ev ? h('button', { type: 'button', class: 'feed-where', onclick: openFolder }, icon('image', 2),
          h('span', { class: 'feed-where-name', text: evTitle(ev) }),
          ev.event_date && ev.status !== 'folder' ? h('span', { class: 'card-meta', text: fmtDateShort(ev.event_date) }) : null)
        : h('span', { class: 'feed-where' }, icon('music', 2), h('span', { class: 'feed-where-name', text: t('musicLibrary') })),
      vis.length ? h('div', { class: 'feedgrid' }, tiles) : null,
      songs.length ? h('div', { class: 'songs' }, songs.slice(0, 3).map(function (s) { return songRow(s, null); })) : null);
  }
  function loadFeed() {
    if (!media.feedLoading) {
      media.feedLoading = api('/api/media?feed=1').then(function (d) {
        media.feed = d; media.feedPaged = false; media.feedStale = false; media.feedLoading = null;
        if (isFeedTab()) state.feedFresh = 0;
      }, function (e) { media.feedLoading = null; throw e; });
    }
    return media.feedLoading;
  }
  function freshFeedVisit() { media.feedPaged = false; media.feedStale = true; }
  function renderFeedTab() {
    var d = media.feed;
    // The badge saw uploads newer than this feed, so fetch again before marking it seen.
    if (!d || media.feedStale || (state.feedFresh && !media.feedPaged)) {
      if (!d) app.appendChild(loader(t('mediaLoading')));
      if (!media.feedLoading) loadFeed().then(render, function (e) { toast(e.message, true); });
      if (!d) return;
    } else markFeedSeen();
    app.appendChild(h('p', { class: 'hint feed-sub', text: t('feedSub') }));
    if (!d.batches.length && !d.next) { app.appendChild(emptyState('pulse', t('feedEmpty'))); return; }
    var list = h('div', { class: 'feed' }, d.batches.map(feedCard));
    app.appendChild(list);
    // Older pages append in place: a repaint would throw away the scroll position.
    var more = h('button', { type: 'button', class: 'btn btn-wide feed-all', text: t('feedOlder'), onclick: function () {
      more.disabled = true;
      api('/api/media?feed=1&before=' + encodeURIComponent(d.next)).then(function (p) {
        more.disabled = false;
        if (media.feed !== d) return;
        d.batches = d.batches.concat(p.batches); d.next = p.next; media.feedPaged = true;
        p.batches.forEach(function (b) { list.appendChild(feedCard(b)); });
        more.hidden = !d.next;
      }, function (e) { more.disabled = false; toast(e.message, true); });
    } });
    more.hidden = !d.next;
    app.appendChild(more);
  }

  function renderMusic(storage) {
    var songs = media.library;
    foldSection('music', t('musicLibrary'), songs.length, false, null,
      storage ? h('div', { class: 'music-add' },
        pickButton(t('addSongs'), AUDIO_ACCEPT, function (files) { uploadFiles(files, null, function () { return 'audio'; }); })) : null,
      !songs.length ? emptyState('music', t('noSongs'))
        : h('div', { class: 'songs' }, songs.map(function (s) { return songRow(s, libraryActions(s)); })));
  }
  function foldSection(key, label, count, openByDefault, extra) {
    var sec = section(label, count || null, extra);
    sec.className += ' tm-sec-fold';
    var det = h('details', { class: 'tm-fold gal-fold', ontoggle: function () { media.open[key] = det.open; } },
      h('summary', { class: 'tm-fold-summary' }, sec), Array.prototype.slice.call(arguments, 5));
    det.open = key in media.open ? media.open[key] : openByDefault;
    app.appendChild(det);
  }

  function videosOf(dance) { return media.videos.filter(function (it) { return danceOf(it) === dance; }); }
  function renderDances() {
    if (!media.videos) return;
    var counts = {}, gigs = {};
    media.videos.forEach(function (it) {
      var d = danceOf(it); if (!d) return;
      counts[d] = (counts[d] || 0) + 1;
      gigs[d] = gigs[d] || {};
      if (it.event_type !== 'team') gigs[d][it.event_id] = 1;
    });
    var alpha = function (a, b) { return a.localeCompare(b, state.lang); };
    var nGigs = function (d) { return Object.keys(gigs[d]).length; };
    var most = media.danceSort !== 'az';
    // Gigs, not videos: a dance filmed in three parts at one gig shouldn't jump ahead.
    var names = Object.keys(counts).sort(!most ? alpha
      : function (a, b) { return nGigs(b) - nGigs(a) || counts[b] - counts[a] || alpha(a, b); });
    if (!names.length) return;
    var present = REGIONS.map(function (r) { return r[0]; }).filter(function (r) { return names.some(function (n) { return regionOf(n) === r; }); });
    var other = names.some(function (n) { return !regionOf(n); });
    var region = media.danceRegion;
    if (region && present.indexOf(region) === -1 && !(region === 'other' && other)) region = null;
    var shown = !region ? names : names.filter(function (n) { return (regionOf(n) || 'other') === region; });
    var setRegion = function (v) {
      media.danceRegion = v;
      try { if (v) localStorage.setItem('bfmh_team_dance_region', v); else localStorage.removeItem('bfmh_team_dance_region'); } catch (e) {}
      render();
    };
    var setSort = function (v) {
      media.danceSort = v;
      try { localStorage.setItem('bfmh_team_dance_sort', v); } catch (e) {}
      render();
    };
    foldSection('dances', t('dances'), names.length, false, null,
      h('p', { class: 'hint', text: t('dancesHint') }),
      h('div', { class: 'frow dance-sort' }, h('span', { class: 'flabel', text: t('sortBy') }),
        chip(t('sortMostDone'), most, function () { setSort('most'); }),
        chip(t('sortAz'), !most, function () { setSort('az'); })),
      h('div', { class: 'frow dance-sort' }, h('span', { class: 'flabel', text: t('region') }),
        chip(t('allRegions'), !region, function () { setRegion(null); }),
        present.map(function (r) { return chip(r, region === r, function () { setRegion(r); }); }),
        other ? chip(t('otherRegion'), region === 'other', function () { setRegion('other'); }) : null),
      h('div', { class: 'dance-chips' }, shown.map(function (n) {
        var k = most ? nGigs(n) : counts[n];
        return h('button', { type: 'button', class: 'chip dance-chip', onclick: function () { openGallery(null, n); } },
          icon('play', 2.4), h('span', { class: 'dance-name', text: n }), h('span', { class: 'gal-n', text: k, title: t(most ? 'danceGigsN' : 'danceVideosN', { n: k }) }));
      })));
  }

  function renderReview(list) {
    app.appendChild(section(t('reviewTitle'), list.length));
    app.appendChild(h('p', { class: 'hint review-hint', text: t('reviewHint') }));
    var viewable = list.filter(function (it) { return it.kind !== 'link'; });
    app.appendChild(h('div', { class: 'review' }, list.map(function (it) {
      var open = it.kind !== 'link' ? function () { lightbox(viewable, viewable.indexOf(it)); }
        : function () { window.open(it.url, '_blank', 'noopener'); };
      return h('div', { class: 'review-item' },
        h('button', { type: 'button', class: 'review-thumb', 'aria-label': t('photos'), onclick: open },
          it.thumb ? thumbImg(it.thumb) : icon('play', 2)),
        h('div', { class: 'review-text' }, h('b', { text: it.title || evTitle({ title: it.event_title }) }),
          h('span', { class: 'song-sub', text: [it.title ? it.event_title : null, addedBy(it)].filter(Boolean).join(' · ') })),
        h('div', { class: 'review-btns' },
          h('button', { type: 'button', class: 'btn btn-sm btn-gold', onclick: function () { setWebsite(it, true); } }, icon('yes', 2.5), t('approve')),
          h('button', { type: 'button', class: 'btn btn-sm', onclick: function () {
            api('/api/media?id=' + it.id, { method: 'PATCH', body: { website: false } })
              .then(function () { toast(t('webDeclined')); reloadMedia(); }).catch(function (e) { toast(e.message, true); });
          } }, icon('no', 2.5), t('decline'))));
    })));
  }

  function pickButton(label, accept, onPick, cls) {
    var input = h('input', { type: 'file', accept: accept, multiple: true, hidden: true, onchange: function () {
      var files = Array.prototype.slice.call(input.files || []); input.value = '';
      if (files.length) onPick(files);
    } });
    return h('label', { class: cls || 'btn btn-sm btn-gold', tabindex: 0, role: 'button',
      onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } } }, icon('plus', 2.5), h('span', { text: label }), input);
  }

  function libraryActions(s) {
    if (!s.can_edit) return null;
    return [{ label: t('rename'), icon: 'edit', onclick: function () { renameSheet(s, reloadMedia); } },
      { label: t('del'), icon: 'trash', cls: 'danger', onclick: function () { deleteItem(s, reloadMedia); } }];
  }
  function songRow(s, actions) {
    return h('div', { class: 'song' },
      h('div', { class: 'song-top' },
        h('span', { class: 'song-ico' }, icon('music', 2)),
        h('span', { class: 'song-name' }, h('b', { text: s.title || t('untitledSong') }),
          h('span', { class: 'song-sub', text: addedBy(s) })),
        s.download ? h('a', { class: 'btn btn-sm btn-icon', href: s.download, 'aria-label': t('download'), title: t('download'), onclick: function () { track('download', null, s.id); } }, icon('download', 2)) : null,
        actions ? h('button', { type: 'button', class: 'btn btn-sm btn-icon', 'aria-label': t('moreActions'), onclick: function () { actionSheet(s.title || t('untitledSong'), actions); } }, icon('more', 2)) : null),
      s.url ? h('audio', { controls: true, preload: 'none', src: s.url, 'data-mid': s.id }) : null);
  }

  function reloadMedia() {
    var jobs = [];
    if (gal) jobs.push(loadGallery());
    if (media.index || isMediaTab()) jobs.push(loadMediaIndex());
    if (media.feed && !media.feedPaged) jobs.push(loadFeed().catch(function () {}));
    return Promise.all(jobs).then(function () { if (isMediaTab() || isFeedTab()) render(); if (gal) paintGallery(); });
  }
  function currentTab() { return state.me && (state.me.role === 'admin' ? state.tab : state.mtab); }
  function isMediaTab() { return currentTab() === 'media'; }
  function isFeedTab() { return currentTab() === 'feed'; }

  function renameSheet(it, after) {
    var pop = popSheet(t('rename'));
    var input = h('input', { value: it.title || '', 'aria-label': t('titleLabel'), maxlength: 200 });
    pop.body.appendChild(h('form', { class: 'form-grid', onsubmit: function (e) {
      e.preventDefault();
      api('/api/media?id=' + it.id, { method: 'PATCH', body: { title: input.value } })
        .then(function () { pop.close(); toast(t('saved')); return after(); }).catch(function (x) { toast(x.message, true); });
    } }, h('label', { class: 'f full' }, h('span', { text: t('titleLabel') }), input),
      h('div', { class: 'pop-btns full' }, h('button', { class: 'btn btn-wide btn-gold', type: 'submit', text: t('save') }),
        h('button', { class: 'btn btn-wide', type: 'button', text: t('cancel'), onclick: pop.close }))));
    input.focus();
  }
  function deleteItem(it, after) {
    return confirmSheet(t('deleteMediaAsk'), t('del'), true).then(function (yes) {
      if (!yes) return false;
      return api('/api/media?id=' + it.id, { method: 'DELETE' }).then(function () { toast(t('deleted')); after(); return true; })
        .catch(function (e) { toast(e.message, true); return false; });
    });
  }

  /* ── one gig's gallery (full-screen layer over the app) ── */
  function openGallery(eventId, dance) {
    closeGallery(true);
    gal = { id: eventId, dance: dance || null, data: null, root: h('div', { class: 'gal', role: 'dialog', 'aria-modal': 'true' }) };
    if (dance) track('dance', null, null, dance); else track('gallery', eventId);
    document.body.appendChild(gal.root);
    document.body.classList.add('has-gal');
    try { history.pushState({ gal: eventId || 'dance' }, ''); gal.pushed = true; } catch (e) {}
    paintGallery();
    loadGallery().then(paintGallery, function (e) { toast(e.message, true); closeGallery(); });
  }
  function closeGallery(silent) {
    if (!gal) return;
    var g = gal; gal = null;
    g.root.remove();
    if (!partyUI) document.body.classList.remove('has-gal');
    if (g.pushed && !silent && history.state && history.state.gal) history.back();
    if (media.index) loadMediaIndex().then(function () { if (isMediaTab()) render(); }).catch(function () {});
    if (g.dirty) loadEvents().then(render).catch(function () {});
  }
  // The gallery can open over an event: Back closes only the top layer.
  window.addEventListener('popstate', function () {
    if (gal) { gal.pushed = false; closeGallery(); }
    else if (partyUI && !(history.state && history.state.party === partyUI.id)) { partyUI.pushed = false; closeParty(); }
  });
  function loadGallery() {
    var g = gal;
    if (g.dance) {
      if (media.videos && !g.data) g.data = videosOf(g.dance);
      return loadMediaIndex().then(function () {
        if (gal === g) g.data = videosOf(g.dance);
      });
    }
    return api('/api/media?event=' + g.id).then(function (d) { if (gal === g) g.data = d; });
  }

  function paintGallery() {
    if (!gal) return;
    if (gal.dance) { paintDance(); return; }
    var d = gal.data, root = gal.root;
    var tray = document.getElementById('upload-tray');
    root.innerHTML = '';
    var ev = d ? d.event : state.events.filter(function (e) { return e.id === gal.id; })[0];
    root.appendChild(h('header', { class: 'gal-head' },
      h('button', { type: 'button', class: 'btn btn-sm btn-icon', 'aria-label': t('close'), onclick: function () { closeGallery(); } }, icon('back', 2.2)),
      h('div', { class: 'gal-title' }, h('b', { text: ev ? evTitle(ev) : t('gallery') }),
        h('span', { class: 'card-meta', text: ev && ev.event_date ? fmtDate(ev.event_date) : '' })),
      d && isOwner() && d.items.some(coverable) ? h('button', { type: 'button', class: 'btn btn-sm gal-cover-btn', onclick: function () { coverSheet(d); } }, icon('image', 2), h('span', { text: t('cover') })) : null,
      d && isOwner() && isFolderish(d.event) ? h('button', { type: 'button', class: 'btn btn-sm btn-icon', 'aria-label': t('folderMenu'),
        onclick: function () { folderActions(d.event); } }, icon('more', 2)) : null));
    if (!d) { root.appendChild(loader(t('mediaLoading'))); return; }

    var shown = d.items.filter(function (i) { return i.kind !== 'audio'; });
    if (isGathering(d.event)) shown.forEach(function (i) { i.noWeb = true; });
    var body = h('div', { class: 'gal-body' });
    root.appendChild(body);
    var eid = gal.id;
    var canUpload = d.storage;
    var bar = h('div', { class: 'gal-actions' });
    body.appendChild(bar);
    if (!canUpload) body.appendChild(h('p', { class: 'hint', text: t('storageOff') }));

    if (canUpload) bar.appendChild(pickButton(t('addMedia'), 'image/*,video/*', function (files) { uploadFiles(files, eid, kindOf); }));
    bar.appendChild(h('button', { type: 'button', class: 'btn btn-sm', 'aria-label': t('addLink'), onclick: function () { linkSheet(eid); } }, icon('link', 2.2), h('span', { text: t('addLinkShort') })));
    body.appendChild(h('p', { class: 'hint', text: t('videoHint') }));
    var photos = shown.filter(function (i) { return i.kind === 'photo'; });
    var clips = shown.filter(function (i) { return i.kind !== 'photo'; });
    var viewable = photos.concat(clips).filter(function (i) { return i.kind !== 'link' || i.youtube; });
    if (!shown.length) body.appendChild(emptyState('image', t('noMedia')));
    [[t('photos'), photos], [t('videos'), clips]].forEach(function (sec) {
      if (!sec[1].length) return;
      body.appendChild(h('h3', { class: 'gal-sec' }, sec[0], h('span', { class: 'gal-n', text: sec[1].length })));
      body.appendChild(h('div', { class: 'photogrid' }, sec[1].map(function (it) { return mediaTile(it, viewable); })));
    });
    if (tray) root.appendChild(tray);
  }
  function paintDance() {
    var list = gal.data, root = gal.root;
    root.innerHTML = '';
    root.appendChild(h('header', { class: 'gal-head' },
      h('button', { type: 'button', class: 'btn btn-sm btn-icon', 'aria-label': t('close'), onclick: function () { closeGallery(); } }, icon('back', 2.2)),
      h('div', { class: 'gal-title' }, h('b', { text: gal.dance }),
        h('span', { class: 'card-meta', text: list ? plural(list.length, 'videoOne', 'videoMany') : t('danceVideos') }))));
    if (!list) { root.appendChild(loader(t('mediaLoading'))); return; }
    var body = h('div', { class: 'gal-body' });
    root.appendChild(body);
    if (!list.length) { body.appendChild(emptyState('play', t('noDanceVideos'))); return; }
    var viewable = list.filter(function (i) { return i.kind !== 'link' || i.youtube; });
    body.appendChild(h('div', { class: 'photogrid' }, list.map(function (it) {
      return h('div', { class: 'dance-item' }, mediaTile(it, viewable),
        h('span', { class: 'dance-gig' }, h('b', { text: evTitle({ title: it.event_title, event_type: it.event_type }) }),
          it.event_date ? h('span', { class: 'card-meta', text: fmtDate(it.event_date) }) : null));
    })));
  }
  function itemActions(it) {
    if (!it.can_edit) return null;
    return [mediaWebAction(it), { label: t('rename'), icon: 'edit', onclick: function () { renameSheet(it, reloadMedia); } },
      { label: t('del'), icon: 'trash', cls: 'danger', onclick: function () { deleteItem(it, function () { if (gal) gal.dirty = true; reloadMedia(); }); } }];
  }
  function fmtDuration(sec) { var m = Math.floor(sec / 60), r = Math.round(sec % 60); if (r === 60) { m++; r = 0; } return m + ':' + (r < 10 ? '0' : '') + r; }
  function kindOf(f) { return /^video\//.test(f.type) ? 'video' : 'photo'; }
  function mediaTile(it, viewable) {
    var n = viewable.indexOf(it);
    var open = it.kind === 'link' && !it.youtube ? function () { window.open(it.url, '_blank', 'noopener'); } : function () { lightbox(viewable, n); };
    var more = it.kind !== 'photo' && it.can_edit ? h('button', { type: 'button', class: 'tile-more', 'aria-label': t('moreActions'),
      onclick: function (e) { e.stopPropagation(); actionSheet(it.title || t('videos'), itemActions(it)); } }, icon('more', 2)) : null;
    var plainLink = it.kind === 'link' && !it.youtube;
    var kindText = h('span', { text: it.youtube ? 'YouTube' : plainLink ? t('linkKind') : t('video') });
    var pic = it.kind === 'photo' ? (it.thumb ? thumbImg(it.thumb) : thumbImg(it.url, true))
      : it.kind === 'video' ? h('video', { muted: true, playsinline: true, preload: 'metadata', src: it.url + '#t=0.1',
        onloadedmetadata: function () { if (isFinite(this.duration)) kindText.textContent = fmtDuration(this.duration); } })
      : it.thumb ? thumbImg(it.thumb) : null;
    var cap = it.kind === 'photo' ? null : h('span', { class: 'tile-cap' },
      h('span', { class: 'tile-kind' + (it.youtube ? ' is-yt' : '') }, icon(plainLink ? 'link' : 'play', 2.4), kindText),
      it.kind === 'link' ? h('span', { class: 'tile-cap-text', text: it.title || it.url.replace(/^https:\/\/(www\.)?/, '').slice(0, 60) }) : null);
    return h('div', { class: 'photo' + (it.kind === 'photo' ? '' : ' is-video') + (pic ? '' : ' is-plain') },
      h('button', { type: 'button', class: 'tile-open', 'aria-label': it.kind === 'photo' ? t('openPhoto', { n: n + 1 }) : it.title || t('openVideo', { n: n + 1 }), onclick: open },
        pic, it.kind === 'photo' || plainLink ? null : h('span', { class: 'video-play' }, icon('play', 2)), cap),
      webBadge(it), more);
  }

  function folderSheet(ev) {
    var pop = popSheet(t(ev ? 'editFolder' : 'newFolder'), ev ? null : t('folderHint'));
    var title = h('input', { value: ev ? ev.title || '' : '', placeholder: t('folderTitlePh'), 'aria-label': t('titleLabel'), maxlength: 300, required: true });
    var dated = ev && ev.status !== 'folder';
    var date = h('input', { type: 'date', value: ev ? ev.event_date || '' : todayIso(), 'aria-label': t('dateLabel'), required: dated });
    pop.body.appendChild(h('form', { class: 'form-grid', onsubmit: function (e) {
      e.preventDefault();
      var body = { title: title.value.trim(), event_date: date.value || null };
      var req = ev ? api('/api/events/' + ev.id, { method: 'PATCH', body: body })
        : api('/api/events', { method: 'POST', body: Object.assign({ status: 'folder', event_type: 'team' }, body) });
      req.then(function (r) {
        pop.close(); toast(t('saved'));
        if (ev) { if (dated && gal) gal.dirty = true; return reloadMedia(); }
        return loadMediaIndex().then(function () { if (isMediaTab()) render(); openGallery(r.id); });
      }).catch(function (x) { toast(x.message, true); });
    } }, h('label', { class: 'f full' }, h('span', { text: t('titleLabel') }), title),
      h('label', { class: 'f full' }, h('span', { text: t('dateLabel') }), date),
      dated ? null : h('p', { class: 'hint full', text: t('folderDateHint') }),
      h('div', { class: 'pop-btns full' }, h('button', { class: 'btn btn-wide btn-gold', type: 'submit', text: t(ev ? 'save' : 'add') }),
        h('button', { class: 'btn btn-wide', type: 'button', text: t('cancel'), onclick: pop.close }))));
    title.focus();
  }
  function isFolderish(ev) { return ev.status === 'folder' || ev.event_type === 'team'; }
  function folderActions(ev) {
    actionSheet(evTitle(ev), [{ label: t('editFolder'), icon: 'edit', onclick: function () { folderSheet(ev); } },
      { label: t('deleteFolder'), icon: 'trash', cls: 'danger', onclick: function () {
        var folder = ev.status === 'folder';
        confirmSheet(folder ? t('deleteFolderAsk') : t('deleteGatheringAsk', { title: evTitle(ev) }), t('del'), true).then(function (yes) {
          if (!yes) return;
          api('/api/events/' + ev.id, { method: 'DELETE' }).then(function () { toast(t('deleted')); if (!folder && gal) gal.dirty = true; closeGallery(); })
            .catch(function (e) { toast(e.message, true); });
        });
      } }]);
  }
  function coverable(it) { return (it.kind === 'photo' && it.thumb) || !!it.youtube; }
  function coverSheet(d) {
    var pop = popSheet(t('coverTitle'), t('coverHint'));
    var current = d.event.cover_media_id;
    function pick(id) {
      api('/api/media', { method: 'POST', body: { action: 'cover', event_id: d.event.id, media_id: id } })
        .then(function () { d.event.cover_media_id = id; pop.close(); toast(t('coverSet')); paintGallery(); })
        .catch(function (e) { toast(e.message, true); });
    }
    var picks = d.items.filter(coverable);
    picks = picks.filter(function (it) { return it.kind === 'photo'; }).concat(picks.filter(function (it) { return it.kind !== 'photo'; }));
    pop.body.appendChild(h('div', { class: 'cover-grid' }, picks.map(function (it) {
      var on = it.id === current;
      return h('button', { type: 'button', class: 'cover-pick' + (on ? ' is-on' : ''), 'aria-pressed': on ? 'true' : 'false',
        'aria-label': it.title || t(it.kind === 'photo' ? 'photos' : 'videos'), onclick: function () { pick(it.id); } },
        thumbImg(it.thumb), on ? h('span', { class: 'cover-check' }, icon('yes', 3)) : null);
    })));
    if (current) pop.body.appendChild(h('button', { type: 'button', class: 'btn btn-wide', text: t('coverAuto'), onclick: function () { pick(null); } }));
  }

  function linkSheet(eventId) {
    var pop = popSheet(t('addLink'), t('linkHint'));
    var url = h('input', { type: 'url', inputmode: 'url', placeholder: 'https://youtu.be/…', 'aria-label': t('linkUrl'), required: true });
    pop.body.appendChild(h('form', { class: 'form-grid', onsubmit: function (e) {
      e.preventDefault();
      api('/api/media', { method: 'POST', body: { action: 'link', event_id: eventId, url: url.value } })
        .then(function () { pop.close(); toast(t('saved')); if (gal) gal.dirty = true; return reloadMedia(); })
        .catch(function (x) { toast(x.message, true); });
    } }, h('label', { class: 'f full' }, h('span', { text: t('linkUrl') }), url),
      h('div', { class: 'pop-btns full' }, h('button', { class: 'btn btn-wide btn-gold', type: 'submit', text: t('add') }),
        h('button', { class: 'btn btn-wide', type: 'button', text: t('cancel'), onclick: pop.close }))));
    url.focus();
  }

  /* ── lightbox ──────────────────────────────────────────── */
  function lightbox(items, start) {
    var i = start;
    var img = h('img', { class: 'lb-img', alt: '' });
    var vid = h('video', { class: 'lb-img', controls: true, playsinline: true, preload: 'metadata' });
    var yt = h('iframe', { class: 'lb-img lb-yt', title: 'YouTube', allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen', allowfullscreen: true, referrerpolicy: 'strict-origin-when-cross-origin' });
    // A cross-origin iframe swallows touches, so YouTube items get edge strips to swipe on.
    var swipeL = h('span', { class: 'lb-swipe lb-swipe-l' }), swipeR = h('span', { class: 'lb-swipe lb-swipe-r' });
    var ytOpen = h('a', { class: 'btn btn-sm btn-icon', target: '_blank', rel: 'noopener', 'aria-label': t('openYoutube'), title: t('openYoutube') }, icon('link', 2.2));
    var count = h('span', { class: 'lb-count' });
    var who = h('span', { class: 'lb-who' });
    var dl = h('a', { class: 'btn btn-sm btn-icon', 'aria-label': t('download'), title: t('download'), onclick: function () { track('download', items[i].event_id, items[i].id); } }, icon('download', 2));
    var del = h('button', { type: 'button', class: 'btn btn-sm btn-icon', 'aria-label': t('del'), title: t('del'), onclick: function () {
      deleteItem(items[i], function () { if (gal) gal.dirty = true; reloadMedia(); }).then(function (gone) {
        if (!gone) return;
        items = items.slice(0, i).concat(items.slice(i + 1));
        if (!items.length) close(); else show(i);
      });
    } }, icon('trash', 2));
    var web = h('button', { type: 'button', class: 'btn btn-sm lb-web', onclick: function () {
      webToggle(items[i]).then(function () { show(i); });
    } }, icon('website', 2), h('span'));
    var root = h('div', { class: 'lb', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('photos') },
      h('div', { class: 'lb-bar' },
        h('button', { type: 'button', class: 'btn btn-sm btn-icon', 'aria-label': t('close'), onclick: close }, icon('close', 2.2)),
        count, h('span', { class: 'lb-spacer' }), web, ytOpen, dl, del),
      h('div', { class: 'lb-stage' }, img, vid, yt, swipeL, swipeR,
        h('button', { type: 'button', class: 'lb-nav lb-prev', 'aria-label': t('previous'), onclick: function () { show(i - 1); } }, icon('back', 2.2)),
        h('button', { type: 'button', class: 'lb-nav lb-next', 'aria-label': t('next'), onclick: function () { show(i + 1); } }, icon('chevron', 2.2))),
      who);
    function show(n) {
      i = (n + items.length) % items.length;
      var it = items[i];
      var isVid = it.kind === 'video', isYt = !!it.youtube;
      vid.pause(); img.hidden = isVid || isYt; vid.hidden = !isVid; yt.hidden = !isYt; swipeL.hidden = swipeR.hidden = !isYt; ytOpen.hidden = !isYt; dl.hidden = isYt;
      if (!isVid) vid.removeAttribute('src');
      if (!isYt && yt.src) yt.src = 'about:blank';
      if (isYt) { img.removeAttribute('src'); yt.src = 'https://www.youtube-nocookie.com/embed/' + it.youtube + '?autoplay=1&playsinline=1&rel=0'; ytOpen.href = it.url; }
      else if (isVid) { img.removeAttribute('src'); vid.src = it.url; } else img.src = it.url;
      count.textContent = (i + 1) + ' / ' + items.length; who.textContent = [it.title, addedBy(it)].filter(Boolean).join(' · ');
      dl.href = it.download || it.url; del.hidden = !it.can_edit;
      vid.setAttribute('data-mid', it.id); dl.setAttribute('data-mid', it.id);
      track('view', it.event_id, it.id); if (isYt) track('play', it.event_id, it.id);
      web.hidden = !mediaWebAction(it); web.classList.toggle('is-on', !!it.website); web.classList.toggle('is-pending', !it.website && !!it.suggested);
      web.lastChild.textContent = webShortLabel(it); web.title = webLabel(it);
      var next = items[(i + 1) % items.length]; if (next && next.kind === 'photo') { var pre = new Image(); pre.src = next.url; }
    }
    var x0 = null;
    root.addEventListener('touchstart', function (e) { x0 = e.touches.length === 1 && !vid.contains(e.target) ? e.touches[0].clientX : null; }, { passive: true });
    root.addEventListener('touchend', function (e) {
      if (x0 == null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1));
    });
    function onKey(e) {
      if (document.querySelector('.pop-back')) return;
      if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') show(i + 1); else if (e.key === 'ArrowLeft') show(i - 1);
    }
    function close() { vid.pause(); root.remove(); document.removeEventListener('keydown', onKey); }
    document.addEventListener('keydown', onKey);
    document.body.appendChild(root);
    show(i);
  }

  /* ── uploads ───────────────────────────────────────────── */
  /* Decoding through <img> applies EXIF rotation, and Safari decodes HEIC; Chrome can't (falls back). */
  function shrinkPhoto(file) {
    return new Promise(function (resolve, reject) {
      var src = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, ht = img.naturalHeight;
        function draw(max, q) {
          var s = Math.min(1, max / Math.max(w, ht));
          var c = document.createElement('canvas'); c.width = Math.round(w * s); c.height = Math.round(ht * s);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          return new Promise(function (ok, no) { c.toBlob(function (b) { if (b) ok(b); else no(new Error('encode')); }, 'image/jpeg', q); });
        }
        Promise.all([file.type === 'image/gif' ? file : draw(2560, 0.86), draw(480, 0.75)]).then(function (b) {
          URL.revokeObjectURL(src);
          // Always the re-encode (GIFs aside): it drops EXIF, so no GPS rides along to bfmh.dance.
          resolve({ blob: b[0], thumb: b[1].size <= 1048576 ? b[1] : null, width: w, height: ht });
        }, function (e) { URL.revokeObjectURL(src); reject(e); });
      };
      img.onerror = function () { URL.revokeObjectURL(src); reject(new Error('decode')); };
      img.src = src;
    });
  }
  function putFile(url, blob, onProgress) {
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest();
      x.open('PUT', url);
      if (blob.type) x.setRequestHeader('Content-Type', blob.type);
      if (onProgress) x.upload.onprogress = function (e) { if (e.lengthComputable) onProgress(e.loaded / e.total); };
      x.onload = function () { if (x.status >= 200 && x.status < 300) resolve(); else reject(new Error(t('uploadRefused', { n: x.status }))); };
      x.onerror = function () { reject(new Error(t('uploadNetwork'))); };
      x.send(blob);
    });
  }
  // iOS greys out audio files in the Files picker for a bare audio/*, and some browsers report no type at all.
  var AUDIO_EXT = { mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav', aif: 'audio/aiff', aiff: 'audio/aiff', flac: 'audio/flac', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg' };
  var AUDIO_ACCEPT = 'audio/*,' + Object.keys(AUDIO_EXT).map(function (x) { return '.' + x; }).join(',');
  function uploadOne(file, kind, eventId, onProgress) {
    if (kind === 'audio' && !/^audio\//.test(file.type)) {
      var guess = AUDIO_EXT[(file.name.match(/\.([a-z0-9]+)$/i) || ['', ''])[1].toLowerCase()];
      if (guess) file = new File([file], file.name, { type: guess });
    }
    var prep = kind === 'photo' ? shrinkPhoto(file).catch(function () { return { blob: file }; }) : Promise.resolve({ blob: file });
    return prep.then(function (p) {
      var name = p.blob === file ? file.name : file.name.replace(/\.[^.]+$/, '') + '.jpg';
      return api('/api/media', { method: 'POST', body: { action: 'upload', kind: kind, event_id: eventId, name: name, type: p.blob.type || file.type,
        size: p.blob.size, thumb: !!p.thumb, thumb_size: p.thumb ? p.thumb.size : 0, width: p.width, height: p.height } }).then(function (r) {
        var jobs = [putFile(r.put, p.blob, onProgress)];
        if (r.thumb_put) jobs.push(putFile(r.thumb_put, p.thumb));
        return Promise.all(jobs).then(function () {
          return api('/api/media', { method: 'POST', body: { action: 'done', id: r.id } });
        }, function (e) {
          api('/api/media?id=' + r.id, { method: 'DELETE' }).catch(function () {});
          throw e;
        });
      });
    });
  }
  var uploads = { total: 0, done: 0, failed: [], progress: {}, running: 0, queue: [] };
  function paintTray() {
    var tray = document.getElementById('upload-tray');
    var busy = uploads.done + uploads.failed.length < uploads.total;
    if (!busy) { if (tray) tray.remove(); return; }
    if (!tray) { tray = h('div', { id: 'upload-tray', class: 'upload-tray', role: 'status' }); (gal ? gal.root : document.body).appendChild(tray); }
    var frac = 0; Object.keys(uploads.progress).forEach(function (k) { frac += uploads.progress[k]; });
    var pct = Math.round((uploads.done + uploads.failed.length + frac) / uploads.total * 100);
    tray.innerHTML = '';
    tray.appendChild(h('span', { text: t('uploadingN', { n: Math.min(uploads.done + uploads.failed.length + 1, uploads.total), total: uploads.total }) }));
    tray.appendChild(h('div', { class: 'meter' }, h('i', { style: 'flex:' + pct + ';background:var(--gold)' }), h('i', { style: 'flex:' + (100 - pct) })));
  }
  function uploadFiles(files, eventId, kindOf) {
    if (!uploads.running && uploads.done + uploads.failed.length >= uploads.total) uploads = { total: 0, done: 0, failed: [], progress: {}, running: 0, queue: [] };
    files.forEach(function (f) { uploads.queue.push({ file: f, kind: kindOf(f), eventId: eventId, id: ++uploads.total }); });
    paintTray();
    pump();
  }
  function pump() {
    while (uploads.running < 2 && uploads.queue.length) {
      var job = uploads.queue.shift();
      uploads.running++;
      (function (job) {
        uploadOne(job.file, job.kind, job.eventId, function (f) { uploads.progress[job.id] = f; paintTray(); })
          .then(function () { uploads.done++; if (gal && gal.id === job.eventId) gal.dirty = true; },
            function (e) { uploads.failed.push(job.file.name + ': ' + e.message); })
          .then(function () {
            delete uploads.progress[job.id]; uploads.running--;
            paintTray();
            if (!uploads.running && !uploads.queue.length) finishUploads(); else pump();
          });
      })(job);
    }
  }
  function finishUploads() {
    if (uploads.failed.length) toast(t('uploadFailed', { n: uploads.failed.length }) + ' ' + uploads.failed[0], true);
    else toast(plural(uploads.done, 'uploadedOne', 'uploadedMany'));
    reloadMedia();
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

    var meSel = h('select', { onchange: function () {
      var id = meSel.value ? Number(meSel.value) : null;
      api('/api/auth', { method: 'POST', body: { as_family: id } })
        .then(function (r) { state.me.family = r.family || undefined; toast(t('youSaved')); })
        .catch(function (x) { toast(x.message, true); meSel.value = state.me.family ? String(state.me.family.id) : ''; });
    } }, h('option', { value: '', text: t('youNone') }), state.families.map(function (f) {
      return h('option', { value: String(f.id), text: f.name, selected: Boolean(state.me.family && state.me.family.id === f.id) });
    }));
    app.appendChild(section(t('youTitle')));
    app.appendChild(h('p', { class: 'tm-sub', text: t('youSub') }));
    app.appendChild(h('div', { class: 'card form-grid' }, field(t('youFamily'), meSel, true)));

    app.appendChild(section(t('families'), state.families.length,
      h('button', { class: 'btn btn-sm btn-gold', text: t('addAFamily'), onclick: function () { form.hidden = !form.hidden; if (!form.hidden) name.focus(); } })));
    app.appendChild(h('p', { class: 'tm-sub', text: t('familiesSub') }));
    app.appendChild(form);

    if (!state.families.length) app.appendChild(emptyState('calendar', t('noFamilies')));
    var grid = h('div', { class: 'famgrid' });
    state.families.forEach(function (f) {
      var card = h('div', { class: 'card family-card' + (f.groupme_user_id ? '' : ' quiet') });
      card.appendChild(h('div', { class: 'fam-top' },
        h('h3', { class: 'card-title sm' }, h('button', { class: 'fam-name', 'aria-label': t('editFamily') + ' — ' + f.name, onclick: function () { openFamilyModal(f); } }, f.name, icon('edit', 2))),
        f.groupme_user_id ? h('span', { class: 'chip yes' }, icon('yes', 3), t('botLinkedChip')) : h('span', { class: 'chip none', text: t('notLinked') })));
      card.appendChild(h('div', { class: 'chips' }, f.dancers.map(function (d) {
        return h('span', { class: 'chip' + (d.active ? '' : ' is-off'), title: d.active ? (d.groupme_user_id ? t('ownGroupmeTag') : false) : t('pausedTag') },
          d.groupme_user_id ? icon('chat', 2) : null, d.name, h('button', { text: '✕', title: t('remove') + ' ' + d.name, onclick: function () {
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
          : h('button', { class: 'btn btn-sm btn-gold btn-wrap', text: t('copyInvite'), onclick: function () { copyText(f.invite_link); } }),
        navigator.share ? h('button', { class: 'btn btn-sm btn-wrap', text: t('copyInvite'), onclick: function () { copyText(f.invite_link); } }) : null,
        h('button', { class: 'btn btn-sm btn-icon', 'aria-label': t('moreActions'), onclick: function () {
          actionSheet(f.name, [
            { label: t('editFamily'), icon: 'edit', onclick: function () { openFamilyModal(f); } },
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

  function openFamilyModal(f) {
    var nameIn = h('input', { value: f.name, required: true, 'aria-label': t('familyNameLabel') });
    var gmSel = h('select', { 'aria-label': t('groupmeLabel') });
    function senderName(id) {
      var m = (state.botLog || []).filter(function (x) { return x.user_id === id; })[0];
      return m && m.sender_name;
    }
    // Links inside this family stay pickable so one can move between rows.
    var claimed = {};
    state.families.forEach(function (o) {
      if (o.id === f.id) return;
      if (o.groupme_user_id) claimed[o.groupme_user_id] = true;
      o.dancers.forEach(function (d) { if (d.groupme_user_id) claimed[d.groupme_user_id] = true; });
    });
    function fillSenders(sel, current, noneText) {
      // The log arrives after the sheet opens, so keep whatever the owner has already picked.
      var picked = sel.options.length ? sel.value : (current || '');
      var seen = {}; var opts = [h('option', { value: '', text: noneText })];
      // Listed even when claimed elsewhere or silent since the log window: dropping it would unlink them on save.
      if (current) {
        seen[current] = true;
        opts.push(h('option', { value: current, text: senderName(current) || t('groupmeOther', { id: current }) }));
      }
      (state.botLog || []).forEach(function (m) {
        if (!m.user_id || seen[m.user_id] || claimed[m.user_id]) return;
        seen[m.user_id] = true;
        opts.push(h('option', { value: m.user_id, text: m.sender_name || m.user_id }));
      });
      sel.innerHTML = ''; opts.forEach(function (o) { sel.appendChild(o); });
      sel.value = picked;
      if (sel.selectedIndex < 0) sel.value = '';
    }
    function fillAll() {
      fillSenders(gmSel, f.groupme_user_id, t('groupmeNone'));
      rows.forEach(function (r) { if (r.gm) fillSenders(r.gm, r.wasGm, t('ownGroupmeNone')); });
    }

    var rows = f.dancers.map(function (d) { return { id: d.id, was: d.name, wasActive: d.active, active: d.active, removed: false, wasGm: d.groupme_user_id || '' }; });
    var list = h('div', { class: 'full famrows' });
    function renderRows() {
      list.innerHTML = '';
      list.appendChild(h('span', { class: 'tm-label', text: t('dancers') }));
      rows.forEach(function (r) {
        if (!r.input) r.input = h('input', { value: r.was, placeholder: t('dancerRowName'), 'aria-label': t('dancerRowName') });
        if (!r.gm) { r.gm = h('select', { 'aria-label': t('ownGroupme') }); fillSenders(r.gm, r.wasGm, t('ownGroupmeNone')); }
        r.input.disabled = r.removed; r.gm.disabled = r.removed;
        list.appendChild(h('div', { class: 'famrow' + (r.removed ? ' is-gone' : r.active ? '' : ' is-off') },
          r.input,
          r.removed
            ? h('button', { type: 'button', class: 'btn btn-sm', text: t('undoRemove'), onclick: function () { r.removed = false; renderRows(); } })
            : h('button', { type: 'button', class: 'btn btn-sm', text: r.active ? t('pauseDancer') : t('resumeDancer'),
                onclick: function () { r.active = !r.active; renderRows(); } }),
          r.removed ? null : h('button', { type: 'button', class: 'btn btn-sm btn-danger btn-icon',
            'aria-label': t('remove') + ' ' + (r.input.value.trim() || t('dancerRowName')),
            onclick: function () { r.removed = true; renderRows(); } }, icon('trash', 2)),
          r.removed ? null : h('label', { class: 'famrow-gm' }, h('span', { text: t('ownGroupme') }), r.gm)));
      });
      list.appendChild(h('button', { type: 'button', class: 'btn btn-sm', text: t('addAnotherDancer'),
        onclick: function () { rows.push({ id: null, was: '', active: true, removed: false, wasGm: '' }); renderRows(); list.querySelectorAll('.famrow input')[rows.length - 1].focus(); } }));
      list.appendChild(h('p', { class: 'hint', text: t('pauseHint') }));
      list.appendChild(h('p', { class: 'hint', text: t('ownGroupmeHint') }));
    }
    renderRows();
    fillAll();
    if (state.botLog === null) loadBotLog().then(fillAll);

    var err = h('p', { class: 'error full' });
    var form = h('form', { class: 'form-grid', onsubmit: function (e) {
      e.preventDefault(); err.textContent = '';
      var name = nameIn.value.trim();
      if (!name) { err.textContent = t('needFamilyName'); return; }
      // str() in the API turns '' into null, so refuse instead of dropping the edit and reporting success.
      if (rows.some(function (r) { return !r.removed && r.id && !r.input.value.trim(); })) {
        err.textContent = t('needDancerName'); return;
      }
      var picks = [gmSel.value].concat(rows.filter(function (r) { return !r.removed; }).map(function (r) { return r.gm.value; })).filter(Boolean);
      if (picks.some(function (v, i) { return picks.indexOf(v) !== i; })) { err.textContent = t('groupmeTwice'); return; }
      // Each request folds its result back into the rows, so a Save retried after one failed repeats nothing.
      // The server refuses an account linked twice, so a link moving between rows is released before it is claimed.
      var jobs = []; var claims = [];
      if (name !== f.name || (gmSel.value || '') !== (f.groupme_user_id || '')) {
        var gm = gmSel.value || null;
        (gm && gm !== f.groupme_user_id ? claims : jobs).push(function () {
          return api('/api/families?id=' + f.id, { method: 'PATCH', body: { name: name, groupme_user_id: gm } })
            .then(function () { f.name = name; f.groupme_user_id = gm; });
        });
      }
      rows.forEach(function (r) {
        var dn = r.input.value.trim();
        if (r.removed) {
          if (r.id) jobs.push(function () { return api('/api/dancers?id=' + r.id, { method: 'DELETE' }).then(function () { r.id = null; }); });
          return;
        }
        if (!r.id) {
          var newGm = r.gm.value || null;
          if (dn) (newGm ? claims : jobs).push(function () {
            return api('/api/dancers', { method: 'POST', body: { family_id: f.id, name: dn, groupme_user_id: newGm } })
              .then(function (d) { r.id = d.id; r.was = dn; r.wasActive = true; r.wasGm = newGm || ''; });
          });
          return;
        }
        var patch = {};
        if (dn !== r.was) patch.name = dn;
        if (r.active !== r.wasActive) patch.active = r.active;
        if ((r.gm.value || '') !== r.wasGm) patch.groupme_user_id = r.gm.value || null;
        if (Object.keys(patch).length) (patch.groupme_user_id ? claims : jobs).push(function () {
          return api('/api/dancers?id=' + r.id, { method: 'PATCH', body: patch })
            .then(function () { r.was = dn; r.wasActive = r.active; r.wasGm = r.gm.value || ''; });
        });
      });
      function runAll(list) { return Promise.all(list.map(function (job) { return job().then(function () { return null; }, function (x) { return x; }); })); }
      runAll(jobs).then(function (a) { return runAll(claims).then(function (b) { return a.concat(b); }); })
        .then(function (errs) {
          var failed = errs.filter(Boolean)[0];
          if (failed) { err.textContent = failed.message; return refresh(); }
          closeModal(); toast(t('familySaved')); return refresh();
        });
    } },
      field(t('familyNameLabel'), nameIn, true, true),
      field(t('groupmeLabel'), gmSel, true),
      h('p', { class: 'hint full', text: t('groupmeHint') }),
      list,
      err,
      h('div', { class: 'full card-actions' },
        h('button', { class: 'btn btn-gold', type: 'submit', text: t('save') }),
        h('button', { class: 'btn', type: 'button', text: t('cancel'), onclick: closeModal })));
    modal(t('editFamily'), form);
  }

  function shareInvite(f) {
    navigator.share({ title: 'Ballet Folklórico Mi Herencia', text: t('inviteMsg'), url: f.invite_link })
      .catch(function (e) { if (e && e.name !== 'AbortError') copyText(f.invite_link); });
  }

  var MARK = { yes: '✓', maybe: '?', no: '✗' };
  function groupBotUpdates(r) {
    var byEv = {}, order = [];
    (r.updates || []).forEach(function (u) {
      var k = u.event_date || u.event_title || u.event_id;
      if (!byEv[k]) { byEv[k] = []; order.push(k); }
      byEv[k].push(u);
    });
    order.sort();
    return { byEv: byEv, order: order };
  }
  function botResultText(m) {
    var r = m.result || {};
    if (m.applied) {
      var g = groupBotUpdates(r);
      return g.order.map(function (k) {
        return (/^\d{4}-/.test(k) ? fmtDate(k) : k) + ': ' + g.byEv[k].map(function (u) { return u.dancer_name.split(' ')[0] + ' ' + MARK[u.status]; }).join(' · ');
      }).join('  ·  ') + (r.event_guessed ? ' ' + t('botGuessed') : '');
    }
    var why = { 'no-intent': t('botIgnored'), 'no-dancers': t('botNoDancers'), 'unknown-sender': t('botUnknownSender'), 'no-open-event': t('botNoEvent'), 'no-event-for-date': t('botNoDate'), 'too-vague': t('botVague'), 'announcement': t('botAnnouncement'), 'paused-sender': t('botPaused'), 'kept-existing': t('botKept') }[r.reason] || t('botIgnored');
    if (r.ambiguous && r.ambiguous.length) why += ' — ' + t('botAmbiguous', { names: r.ambiguous.join(', ') });
    return why;
  }
  function botResultNode(m) {
    var r = m.result || {};
    if (!m.applied) return h('p', { class: 'logskip', text: botResultText(m) });
    var g = groupBotUpdates(r);
    var box = h('div', { class: 'logres' });
    g.order.forEach(function (k) {
      var chips = h('div', { class: 'logres-chips' });
      g.byEv[k].forEach(function (u) {
        var first = u.dancer_name.split(' ')[0];
        chips.appendChild(h('span', { class: 'chip chip-xs ' + u.status, 'aria-label': first + ' — ' + t(u.status) }, icon(u.status, 3), first));
      });
      box.appendChild(h('div', { class: 'logres-ev' },
        h('span', { class: 'logres-date', text: /^\d{4}-/.test(k) ? fmtDateShort(k) : String(k) }), chips));
    });
    if (r.event_guessed) box.appendChild(h('span', { class: 'logguess' }, icon('maybe', 2.5), t('botGuessedTag')));
    return box;
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
      '📢 New gig request received! Who can join us for this one?',
      'Quinceañera — Ramirez',
      'Wed, Nov 4 · 7:00 PM–7:30 PM',
      '⏰ Call time / Hora de llegada: 6:15 PM',
      '📍 Grand Ballroom, 1200 E Garvey Ave, West Covina',
      '🗺 https://www.google.com/maps/search/?api=1&query=Grand%20Ballroom%2C%201200%20E%20Garvey%20Ave%2C%20West%20Covina',
      '',
      '👉 RSVP: https://bfmh.dance/team/?e=42&s=…',
    ]],
    ['postAnnouncement', [
      '📣 New gig: are you available?',
      'Quinceañera — Ramirez — Wed, Nov 4, 2026',
      'Time: 7:00 PM–7:30 PM',
      '⏰ Call time / Hora de llegada: 6:15 PM',
      '📍 Where: Grand Ballroom, 1200 E Garvey Ave, West Covina',
      '🗺 https://www.google.com/maps/search/?api=1&query=Grand%20Ballroom%2C%201200%20E%20Garvey%20Ave%2C%20West%20Covina',
      'Dancers needed: 6',
      '',
      '📅 Add to my calendar / Agregar a mi calendario:',
      'https://bfmh.dance/team/?e=42&s=…&cal=1',
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
      '📢 Friendly reminder! This gig is coming up in 4 days. Update your RSVP if anything changed.',
      'Quinceañera — Ramirez',
      'Wed, Nov 4 · 7:00 PM–7:30 PM',
      '⏰ Call time / Hora de llegada: 6:15 PM',
      '📍 Grand Ballroom, 1200 E Garvey Ave, West Covina',
      '🗺 https://www.google.com/maps/search/?api=1&query=Grand%20Ballroom%2C%201200%20E%20Garvey%20Ave%2C%20West%20Covina',
      '',
      '👉 RSVP: https://bfmh.dance/team/?e=42&s=…',
    ]],
    ['postConfirmation', [
      '✅ CONFIRMED: Quinceañera — Ramirez — Wed, Nov 4, 2026',
      'Time: 7:00 PM–7:30 PM',
      '⏰ Call time / Hora de llegada: 6:15 PM',
      '📍 Where: Grand Ballroom, 1200 E Garvey Ave, West Covina',
      '🗺 https://www.google.com/maps/search/?api=1&query=Grand%20Ballroom%2C%201200%20E%20Garvey%20Ave%2C%20West%20Covina',
      '',
      '📅 Add to my calendar / Agregar a mi calendario:',
      'https://bfmh.dance/team/?e=42&s=…&cal=1',
      '',
      'Dancers: Sofia Garcia, Ashley Orozco',
      '',
      'Rehearsals:',
      '• Wed, Oct 28, 2026 6:00 PM @ Studio B',
      '',
      'Details: https://bfmh.dance/team/?e=42&s=…',
    ]],
    ['postCancellation', [
      '❌ CANCELLED: Quinceañera — Ramirez — Wed, Nov 4, 2026',
      'Where: Grand Ballroom, 1200 E Garvey Ave, West Covina',
      '',
      'This gig is off — no need to come.',
      'Este evento se canceló — no hay que ir.',
      '',
      '🗓 Remove from my calendar / Quitar de mi calendario:',
      'https://bfmh.dance/team/?e=42&s=…&cal=1',
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
        h('span', { class: 'gpost-cap' }, icon('chat', 2), t(pp[0]).replace(/^📢\s*/, '')),
        h('div', { class: 'gpost-bubble', text: pp[1].join('\n') }));
    }));

    var reads = h('table', { class: 'guide-ex' }, h('tbody', {}, BOT_EXAMPLES.map(function (r) {
      return h('tr', {}, h('td', { class: 'gx-in', text: '\u201c' + r[0] + '\u201d' }), h('td', { class: 'gx-out', text: r[1] }));
    })));

    var misses = h('ul', { class: 'guide-no' },
      [t('guideM1'), t('guideM2'), t('guideM3'), t('guideM4')].map(function (x) { return h('li', { text: x }); }));

    var guide = h('div', { class: 'card guide-body' },
      h('span', { class: 'tm-label', text: t('guideSteps') }), steps,
      h('span', { class: 'tm-label', text: t('guidePosts') }),
      h('p', { class: 'guide-sub', text: t('guidePostsSub') }), says,
      h('span', { class: 'tm-label', text: t('guideReads') }),
      h('p', { class: 'guide-sub', text: t('guideReadsSub') }), reads,
      h('span', { class: 'tm-label', text: t('guideMisses') }), misses,
      h('p', { class: 'hint', text: t('guideNeedDate') }),
      h('p', { class: 'guide-fix', text: t('guideFix') }));
    app.appendChild(chonaFold(t('guideFold'), 'guideOpen', guide));
    app.appendChild(chonaFold(t('botHeard'), 'logOpen', renderBotLog(listening)));
  }

  function chonaFold(title, key, body) {
    var sec = section(title); sec.className += ' tm-sec-fold';
    var det = h('details', { class: 'tm-fold', ontoggle: function () { botUI[key] = det.open; } },
      h('summary', { class: 'tm-fold-summary' }, sec), body);
    det.open = botUI[key];
    return det;
  }

  var botUI = { filter: 'changes', guideOpen: false, logOpen: true, shown: 25, expanded: {} };
  function botNeedsLook(m) { var r = m.result || {}; return !m.applied && !!r.intent && !!m.user_id; }
  function renderBotLog(listening) {
    var wrap = h('div', {});
    if (!listening) return wrap;
    var bar = h('div', { class: 'frow logfilter' });
    var box = h('div', { class: 'log' });
    wrap.appendChild(bar); wrap.appendChild(box);
    function setFilter(f) { botUI.filter = f; botUI.shown = 25; fill(); }
    function fill() {
      bar.innerHTML = ''; box.innerHTML = '';
      var all = state.botLog || [];
      var counts = { changes: all.filter(function (m) { return m.applied; }).length, attention: all.filter(botNeedsLook).length, all: all.length };
      [['changes', 'logChanges'], ['attention', 'logAttention'], ['all', 'logAll']].forEach(function (f) {
        var c = chip(t(f[1]) + (counts[f[0]] ? ' · ' + counts[f[0]] : ''), botUI.filter === f[0], function () { setFilter(f[0]); });
        bar.appendChild(c);
      });
      var rows = botUI.filter === 'changes' ? all.filter(function (m) { return m.applied; })
        : botUI.filter === 'attention' ? all.filter(botNeedsLook) : all;
      if (!rows.length) { box.appendChild(h('p', { class: 'logempty', text: t(all.length ? 'logNone' : 'botEmpty') })); return; }
      rows.slice(0, botUI.shown).forEach(function (m) { box.appendChild(botLogRow(m)); });
      if (rows.length > botUI.shown) box.appendChild(h('div', { class: 'logmore' },
        h('button', { class: 'btn btn-sm', text: t('logShowMore'), onclick: function () { botUI.shown += 25; fill(); } })));
    }
    if (state.botLog === null) loadBotLog().then(fill); else fill();
    return wrap;
  }
  function botLogRow(m) {
    var r = m.result || {};
    var open = !!botUI.expanded[m.id];
    var msg = h('button', { type: 'button', class: 'logmsg' + (open ? '' : ' clamp'),
      onclick: function () { botUI.expanded[m.id] = !botUI.expanded[m.id]; msg.classList.toggle('clamp', !botUI.expanded[m.id]); } },
      h('span', { class: 'logmsg-text', text: m.text || '' }));
    var actions = [];
    if (botNeedsLook(m)) {
      var known = state.families.some(function (f) {
        return f.groupme_user_id === m.user_id || f.dancers.some(function (d) { return d.groupme_user_id === m.user_id; });
      });
      if (!known) actions.push(h('button', { class: 'btn btn-sm btn-gold', text: t('addFamilyFrom'), onclick: function () { addFamilyFromGroupMe(m); } }));
      actions.push(h('button', { class: 'btn btn-sm', text: t('reread'), onclick: function () { rereadMessage(m); } }));
    }
    if (m.undoable) { var undoBtn = h('button', { class: 'btn btn-sm btn-undo', text: t('undoConfirm'), onclick: function () { undoBotMessage(m, undoBtn); } }); actions.push(undoBtn); }
    else if (m.undone_at) actions.push(h('span', { class: 'logtag', text: t('undoneTag') }));
    return h('div', { class: 'logrow' + (m.applied ? ' applied' : '') + (m.undone_at ? ' undone' : '') },
      h('div', { class: 'loghead' }, h('b', { text: m.sender_name || '?' }), h('span', { class: 'logtime', text: timeAgo(m.created_at || m.received_at || Date.now()) })),
      msg,
      botResultNode(m),
      actions.length ? h('div', { class: 'logacts' }, actions) : null);
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
  function undoBotMessage(m, btn) {
    var updates = (m.result && m.result.updates) || [];
    var list = updates.map(function (u) { return u.dancer_name + ' → ' + t(u.status); }).join(', ');
    confirmSheet(t('undoTitle') + (list ? ' — ' + list : ''), t('undoConfirm')).then(function (yes) {
      if (!yes) return;
      if (btn) btn.disabled = true;
      api('/api/groupme', { method: 'POST', body: { id: m.id, action: 'undo' } }).then(function (d) {
        var restored = (d.restored || []).length, skipped = d.skipped || [];
        var changedSince = skipped.filter(function (s) { return s.reason === 'changed-since'; }).length;
        var deleted = skipped.filter(function (s) { return s.reason === 'dancer-deleted'; }).length;
        var msg = t('undoDone', { n: restored });
        if (changedSince) msg += ' · ' + t('undoSkipped', { n: changedSince });
        if (deleted) msg += ' · ' + t('undoDeleted', { n: deleted });
        toast(msg);
        return Promise.all([loadBotLog(), loadEvents()]).then(render);
      }).catch(function (e) {
        if (btn) btn.disabled = false;
        toast(e.status === 409 ? t('undoAlready') : e.status === 404 ? t('undoNotFound') : t('undoFailed'), true);
      });
    });
  }

  /* ── usage tracking ────────────────────────────────────── */
  var usageQueue = [];
  function isStandalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
  function deviceId() {
    try {
      var id = localStorage.getItem('bfmh_device');
      if (!id) { id = Date.now().toString(36) + Math.random().toString(36).slice(2, 10); localStorage.setItem('bfmh_device', id); }
      return id;
    } catch (e) { return null; }
  }
  function track(action, eventId, mediaId, detail) {
    if (ADMIN_SITE || (state.me && state.me.insights)) return;
    usageQueue.push({ a: action, e: eventId || null, m: mediaId || null, d: detail || null, at: Date.now() });
    if (usageQueue.length >= 40) flushUsage();
  }
  function flushUsage() {
    if (!usageQueue.length || !state.me || state.me.role === 'anon' || state.me.insights) { if (state.me && state.me.insights) usageQueue = []; return; }
    var now = Date.now();
    var body = JSON.stringify({ device: deviceId(), events: usageQueue.splice(0).map(function (e) { return { a: e.a, e: e.e, m: e.m, d: e.d, t: now - e.at }; }) });
    if (navigator.sendBeacon && navigator.sendBeacon('/api/me', body)) return;
    fetch('/api/me', { method: 'POST', body: body, keepalive: true, credentials: 'same-origin' }).catch(function () {});
  }
  setInterval(flushUsage, 15000);
  document.addEventListener('visibilitychange', function () { if (document.hidden) flushUsage(); });
  window.addEventListener('pagehide', flushUsage);
  document.addEventListener('play', function (e) {
    var mid = e.target && e.target.getAttribute && e.target.getAttribute('data-mid');
    if (mid) track('play', null, +mid);
  }, true);

  /* ── insights (admin site) ─────────────────────────────── */
  function hasInsights() { return ADMIN_SITE || !!(state.me && state.me.insights); }
  var insightsLoad = null;
  function loadInsightsScript() {
    if (!insightsLoad) {
      insightsLoad = new Promise(function (ok, fail) {
        var css = h('link', { rel: 'stylesheet', href: '/team/insights.css' }); document.head.appendChild(css);
        var js = h('script', { src: '/team/insights.js' }); js.onload = ok; js.onerror = function () { insightsLoad = null; fail(new Error('Could not load Insights')); };
        document.head.appendChild(js);
      });
    }
    return insightsLoad;
  }
  function renderInsightsTab() {
    fabRoot.innerHTML = '';
    var root = h('div', { class: 'ins' }); app.appendChild(root);
    var ctx = { h: h, icon: icon, api: api, toast: toast, section: section, emptyState: emptyState, loader: loader, lightbox: lightbox,
      openGallery: openGallery, me: state.me, copyText: copyText, typeLabel: typeLabel, lang: state.lang,
      hasEvent: function (id) { return state.events.some(function (e) { return e.id === id; }); },
      openEvent: function (id) {
        var ev = state.events.find(function (e) { return e.id === id; }); if (!ev) return;
        if (isGathering(ev)) openParty(id);
        else if (ev.status === 'inquiry') { state.tab = 'inbox'; state.focusEvent = id; render(); } else openDetail(id);
      } };
    if (window.BFMHInsights) return window.BFMHInsights.render(root, ctx);
    root.appendChild(loader('Loading insights…'));
    loadInsightsScript().then(function () { if (root.isConnected) { root.innerHTML = ''; window.BFMHInsights.render(root, ctx); } },
      function (e) { root.innerHTML = ''; root.appendChild(emptyState('refresh', e.message)); });
  }

  /* ── render dispatch ───────────────────────────────────── */
  function render() {
    if (!state.me || state.me.role === 'anon') return state.pickerGig ? renderPicker(state.pickerGig) : FAMILIA ? renderDirectory() : renderLogin();
    /* #app is the scroller (team.css): a background repaint must not throw the list back to
       the top, but a tab change is a fresh view, so only the same tab keeps its place. */
    var view = state.me.role === 'admin' ? state.tab : state.mtab;
    var scrollTop = app.scrollTop; var sameTab = painted === view; painted = view;
    if (state.me.role === 'admin') renderAdmin(); else renderMember();
    if (sameTab) { if (scrollTop) app.scrollTop = scrollTop; } else app.scrollTop = 0;
    if (state.me.role === 'admin') { if (state.detail) renderDetailSheet(); else if (document.querySelector('#modal-root .modal-detail')) closeModal(); }
  }
  function focusIfNeeded() {
    if (!state.focusEvent) return;
    var el = document.getElementById('event-' + state.focusEvent);
    var id = state.focusEvent; state.focusEvent = null;
    if (el) { var fold = el.closest('details'); if (fold) fold.open = true; el.classList.add('is-flash'); setTimeout(function () { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50); }
    if (state.openCal) {
      state.openCal = false;
      var ev = state.events.filter(function (e) { return +e.id === +id; })[0];
      if (ev && calHref(ev)) calSheet(ev, calHref(ev));
      // Cancelled gigs are filtered out of the family list, so fetch it for the bot's "remove" link.
      else if (!ev && state.gigLink && +state.gigLink.e === id) {
        api('/api/gig?e=' + encodeURIComponent(state.gigLink.e) + '&s=' + encodeURIComponent(state.gigLink.s))
          .then(function (g) { if (calHref(g.event)) calSheet(g.event, calHref(g.event)); }).catch(function () {});
      }
    }
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('/team/sw.js').catch(function () {}); });
  }

  boot();
})();
