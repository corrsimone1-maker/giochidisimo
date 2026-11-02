/* =====================================================================
   DOMANDE DI IMPOSTORE (variante «Numeri»)
   Si modificano solo qui, come le parole.

   { tipo: 'un numero di ore', domande: ['…?', '…?', '…?'] }

   domande  domande che si rispondono con UN NUMERO, SIMILI MA NON TROPPO:
            nel modo «non sa di esserlo» tutti hanno una domanda del gruppo
            e l'impostore un'altra dello stesso gruppo. Le risposte devono
            stare più o meno sullo stesso ordine di grandezza (così il suo
            numero non si nota subito) ma essere un po' diverse (così, letta
            la domanda vera, il suo numero si può smascherare).
            Almeno due domande per gruppo.
   tipo     l'indizio che vede l'impostore nel modo «sa, con indizio»:
            completa la frase «La risposta è …» e vale per tutte le domande
            del gruppo.

   Meglio domande su di sé (si discute del perché del numero) che di
   cultura generale. Apostrofi tipografici (’) dentro le stringhe.
   Dopo una modifica: node prove/impostore.test.js
   ===================================================================== */
self.NUMERI = [
  { tipo: 'un numero di ore', domande: ['Quante ore dormi a notte, di solito?', 'Quante ore al giorno passi al telefono?', 'Quante ore al giorno passi seduto?'] },
  { tipo: 'un numero di volte a settimana', domande: ['Quante volte a settimana mangi la pasta?', 'Quante volte a settimana fai sport?', 'Quante volte a settimana bevi alcolici?'] },
  { tipo: 'un numero di volte a settimana', domande: ['Quante volte a settimana cucini tu?', 'Quante volte a settimana esci la sera?', 'Quante volte a settimana senti i tuoi genitori?'] },
  { tipo: 'una quantità al giorno', domande: ['Quanti caffè bevi al giorno?', 'Quanti bicchieri d’acqua bevi al giorno?', 'Quante volte al giorno ti lavi le mani?'] },
  { tipo: 'una quantità al giorno', domande: ['Quanti messaggi vocali mandi al giorno?', 'Quante telefonate fai al giorno?', 'Quante foto scatti al giorno, in media?'] },
  { tipo: 'un’età', domande: ['A che età hai avuto il tuo primo telefono?', 'A che età hai dato il primo bacio?', 'A che età hai preso la patente?'] },
  { tipo: 'un’età', domande: ['A che età vorresti sposarti (o ti sei sposato)?', 'A che età vorresti avere il primo figlio?', 'A che età sei andato (o vorresti andare) a vivere da solo?'] },
  { tipo: 'un’età', domande: ['A che età si diventa vecchi?', 'A che età vorresti andare in pensione?', 'Fino a che età vorresti vivere?'] },
  { tipo: 'un’età', domande: ['Quanti anni ti senti dentro?', 'Quanti anni dimostri, secondo te?', 'Quanti anni avevi nel periodo più bello della tua vita?'] },
  { tipo: 'una cifra in euro', domande: ['Quanto spenderesti al massimo per una pizza?', 'Quanto spenderesti al massimo per un cocktail?', 'Quanto spenderesti al massimo per un panino?'] },
  { tipo: 'una cifra in euro', domande: ['Quanto spenderesti al massimo per un telefono?', 'Quanto spenderesti al massimo per una bici?', 'Quanto spenderesti al massimo per un divano?'] },
  { tipo: 'una cifra in euro', domande: ['Per quanti euro ti raderesti i capelli a zero?', 'Per quanti euro passeresti una notte da solo in un cimitero?', 'Per quanti euro mangeresti un insetto vivo?'] },
  { tipo: 'una cifra in euro', domande: ['Quanto spenderesti per il regalo di compleanno a un amico?', 'Quanto spenderesti per un regalo al tuo partner?', 'Quanto metteresti nella busta per il matrimonio di un collega?'] },
  { tipo: 'una cifra in euro', domande: ['Quanti euro hai nel portafoglio adesso, più o meno?', 'Quanti euro spendi a settimana al bar?', 'Quanti euro spendi a settimana per mangiare fuori?'] },
  { tipo: 'un voto da 1 a 10', domande: ['Da 1 a 10, quanto ti piace l’ananas sulla pizza?', 'Da 1 a 10, quanto ti piacciono i film horror?', 'Da 1 a 10, quanto ti piace il sushi?'] },
  { tipo: 'un voto da 1 a 10', domande: ['Da 1 a 10, quanto sei disordinato?', 'Da 1 a 10, quanto sei puntuale?', 'Da 1 a 10, quanto sei competitivo ai giochi da tavolo?'] },
  { tipo: 'un voto da 1 a 10', domande: ['Da 1 a 10, quanta paura hai dei ragni?', 'Da 1 a 10, quanta paura hai dell’aereo?', 'Da 1 a 10, quanta paura hai del dentista?'] },
  { tipo: 'un voto da 1 a 10', domande: ['Da 1 a 10, quanto sei bravo a cucinare?', 'Da 1 a 10, quanto sei bravo a ballare?', 'Da 1 a 10, quanto sei bravo a cantare?'] },
  { tipo: 'un voto da 1 a 10', domande: ['Da 1 a 10, quanto credi agli oroscopi?', 'Da 1 a 10, quanto credi ai fantasmi?', 'Da 1 a 10, quanto credi agli alieni?'] },
  { tipo: 'un voto da 1 a 10', domande: ['Da 1 a 10, quanto sei permaloso?', 'Da 1 a 10, quanto sei geloso?', 'Da 1 a 10, quanto sei testardo?'] },
  { tipo: 'un numero di persone', domande: ['Quante persone inviteresti a una cena a casa tua?', 'Con quante persone andresti in vacanza, al massimo?', 'Quanti amici veri hai?'] },
  { tipo: 'un numero di persone', domande: ['Quante persone vorresti al tuo matrimonio?', 'Quanti invitati vorresti alla tua festa di compleanno?', 'Quante persone c’erano alla festa più grande a cui sei stato?'] },
  { tipo: 'un numero di minuti', domande: ['Quanti minuti ci metti a prepararti la mattina?', 'Quanti minuti stai sotto la doccia?', 'Quanti minuti ci metti a fare colazione?'] },
  { tipo: 'un numero di minuti', domande: ['Quanti minuti aspetti un amico in ritardo prima di arrabbiarti?', 'Quanti minuti faresti di fila per il ristorante più buono della città?', 'Quanti minuti ci metti ad arrivare al lavoro o all’università?'] },
  { tipo: 'un numero di chilometri', domande: ['Quanti chilometri faresti per mangiare la pizza più buona del mondo?', 'Quanti chilometri faresti in macchina per un concerto?', 'Quanti chilometri faresti per un primo appuntamento?'] },
  { tipo: 'una temperatura in gradi', domande: ['Sotto quanti gradi accendi il riscaldamento?', 'Sopra quanti gradi vai al mare?', 'A quanti gradi metti il condizionatore d’estate?'] },
  { tipo: 'un numero di volte nella vita', domande: ['Quante volte hai visto il tuo film preferito?', 'Quante volte hai cambiato casa?', 'Quante volte sei stato all’estero?'] },
  { tipo: 'un numero di volte nella vita', domande: ['Quante volte ti sei innamorato?', 'Quante volte ti hanno lasciato?', 'Quante volte hai pianto al cinema?'] },
  { tipo: 'un numero di volte', domande: ['Quante volte hai perso le chiavi quest’anno?', 'Quante volte hai perso un treno o un aereo?', 'Quante volte hai dimenticato un compleanno importante?'] },
  { tipo: 'un numero di cose che hai', domande: ['Quante paia di scarpe hai?', 'Quante felpe hai?', 'Quante tazze ci sono a casa tua?'] },
  { tipo: 'un numero di cose sul telefono', domande: ['Quante app hai sul telefono?', 'Quanti gruppi WhatsApp hai?', 'Quante schede hai aperte nel browser adesso?'] },
  { tipo: 'un numero all’anno', domande: ['Quanti libri leggi in un anno?', 'Quante volte all’anno vai al cinema?', 'Quante serie TV hai iniziato senza finirle?'] },
  { tipo: 'un numero di volte all’anno', domande: ['Quante volte all’anno vai dal parrucchiere o dal barbiere?', 'Quante volte all’anno vai a un concerto?', 'Quante volte all’anno prendi l’aereo?'] },
  { tipo: 'una percentuale', domande: ['Che percentuale della giornata passi a pensare al cibo?', 'Che percentuale delle persone che conosci ti sta davvero simpatica?', 'Che percentuale delle cose che ti dicono dimentichi entro una settimana?'] },
  { tipo: 'una percentuale', domande: ['Con che probabilità (in %) domani arrivi puntuale?', 'Con che probabilità (in %) vinci un gioco da tavolo stasera?', 'Con che probabilità (in %) rispondi a un messaggio entro un’ora?'] },
  { tipo: 'un anno', domande: ['In che anno è uscito il primo iPhone?', 'In che anno è nato Facebook?', 'In che anno è nato YouTube?'] },
  { tipo: 'un anno', domande: ['In che anno è caduto il muro di Berlino?', 'In che anno l’Italia ha vinto i Mondiali in Spagna?', 'In che anno sono arrivati gli euro nelle nostre tasche?'] },
  { tipo: 'un anno', domande: ['In che anno hai fatto il viaggio più bello della tua vita?', 'In che anno hai conosciuto il tuo migliore amico?', 'In che anno sei stato più felice?'] },
  { tipo: 'un numero di anni', domande: ['Quanti anni ha il Colosseo, più o meno?', 'Quanti anni ha la Torre di Pisa, più o meno?', 'Quanti anni ha la Cappella Sistina, più o meno?'] },
  { tipo: 'una velocità in km/h', domande: ['A quanti km/h vai in autostrada, di solito?', 'Qual è la velocità più alta a cui sei andato in macchina, in km/h?', 'A quanti km/h va un Frecciarossa, secondo te?'] },
  { tipo: 'una quantità di cibo', domande: ['Quante pizze riusciresti a mangiare da solo in una sera?', 'Quante fette di torta mangeresti a una festa?', 'Quanti supplì riesci a mangiare di fila?'] },
  { tipo: 'una quantità a settimana', domande: ['Quanti cornetti mangi in una settimana?', 'Quanti gelati mangi in una settimana d’estate?', 'Quante merendine mangi in una settimana?'] },
  { tipo: 'un numero di giorni', domande: ['Quanti giorni potresti stare senza telefono?', 'Quanti giorni riusciresti a stare senza uscire di casa?', 'Quanti giorni di vacanza ti servono per staccare davvero?'] },
  { tipo: 'un numero di volte, la mattina', domande: ['Quante sveglie metti la mattina?', 'Quante volte premi «posponi» prima di alzarti?', 'Quante volte guardi il telefono prima di alzarti dal letto?'] }
];
