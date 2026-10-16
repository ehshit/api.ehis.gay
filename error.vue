<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { NuxtError } from "#app";

const props = defineProps<{ error: NuxtError }>();

const status = computed(() => Number(props.error?.statusCode) || 500);

const notFoundMessages = [
  "Nothing to see here!",
  "Do you exist? Because i don't!",
  "This page is gone",
  "Page decided to do not exist.",
  "Eh?",
  "Insert ghost sounds here.",
  "this page is in another place!",
  "Dead end!",
  "there must be a page but it's not here",
  "Sorry i cannot fulfill this request. This page does not exist.",
  "Did you made a typo?",
  "Nothing else here but silly four zero and four number :(",
  "Wrong way bro",
  "Manually Randomly chosen flight: EK141",
  "I STOLE THIS PAGE!!!",
  "Nuh-uh",
  "Look around",
  "(Complaint)",
  "Stupid Stupid, i don’t know what the door is.",
  "RGB!! RGB!!",
  "Is there something else u need?",
  "we are building it",
  "Hello, how do i create this page?",
  "It’s not down.",
  "Whoops. Dead end.",
  "WHILE YOU ARE HERE, YOU CAN GET [[PAGE GENERATOR 1997]] FOR 9.99 DOLLARS. HERE [[HYPERLINK BLOCKED]]",
  "M?",
  "I don’t see it.",
  "Ding.",
  "I luv ya :3",
  "Mreow ",
  "Nothing to see here.",
  "What did you expect? some easter egg?",
  "Insert Easter egg Here",
  "You are not supposed to be here",
  "Drink water",
  "KRIS WHERE ARE WE???",
  "Eepy",
  "I will build this page later so baii ",
  "THERE WAS PAGE ",
  "eehhmmm",
  "Somewhere ",
  "Four Zero Four in text if u wonder :P",
  "Hello!",
  "Ooooo…",
  "Slippy hands on yer keyboard",
  "No one’s around to help.",
  "Somewhere in pile",
  "What you should to do? Nothing!",
  "Go home while you can!",
  "AAARGH!",
  "Oh, fiddlesticks. What now?",
  "Placeholder here",
  "m?",
  ":(",
  "Play Mario Kart WII",
  "mrmrmrmrm",
  "sheesh",
  "Hello, i am your 404 Guy",
  "so eepy",
  "Go play",
  "Maooow",
  "Leave :)",
];

const serverMessages = [
  "the server tripped over its own tail, give it a sec",
  "something exploded behind the scenes, we're sweeping it up",
  "the hamsters powering this thing need a snack",
  "oopsie, we dropped the database in the sink",
  "a cat walked across the keyboard, fixing it now",
  "blep. the backend fell over, try again in a moment",
  "we broke it, not you, retrying usually works",
  "the bits got scrambled, we're un-scrambling them",
  "everything is fine (it is not), give us a sec",
  "5 and bunch of zeroes eughhh",
  "Nope",
  "Did we something break it?",
  "Whoops…",
  "I don’t have any ideas what happened here",
  "Something borked sowwy",
  "Server does not working for some reason",
  "Lemme find the issue",
  "maybe 1000 error?",
  "Do’h i mist!",
  "server is not servering today",
  "thank you windows",
  "thank you linux",
  "thank you mac… who even runs server on mac os",
  "thank you [[insert potato server here]]",
  "Sorry i cannot fulfill this request.",
  "BACKDOWN IS NOT BACKDOWNING",
  "eepy",
  "unhandled thingy yadda",
  "how do i run",
  "разработчики введите возможность ловить покемонов в игре!!!",
  "today i decided to be a deutsch server and suddenly sunday hit the date",
  "i feeling bad",
  "bad time",
  "YOUR REQUEST IS TAKING TOO LONG",
  "fun fact: i am dead",
  "Go play",
  "Well, let me have a rule and a saw and a board and I’ll cut it",
  "eh",
  "Oh fiddlesticks. What now?",
  "Listen [[MUSIC]]",
  "Pull up!",
  "Door is stuck",
  "Intel core processor",
  "Where is another server",
  "Now i can’t do anything but sing that stupid song.",
  "CMOOON",
  "Wait 10 business days then.",
  "On the break!",
  "am dead",
  "Randomly chosen flight: XR422",
  "Grab dat auto",
  "THIS SERVER HAS BEEN CAPTURED BY SONIC EXE",
  "THIS SERVER HAS BEEN NOT CAPTURED AND IS SLEEPING",
  "THIS SERVER… eeeeermmm….",
  "Airbus A380",
  "Boeing 747-400",
  "We love you!",
  "aaaaaaaaa",
  "today u watch cat videos instead",
  "mraow",
  "mrrow",
  "mreow",
  "meow",
  "maow",
  "mow ",
  "miau",
  "мяу",
  "mrow ",
  "maw",
  "mew",
  "kris where are we",
  "oooooo",
  "Ü",
  "OHOHOHOHO -queen",
  "Do i even exist?",
  "Unplanned sleeping",
  ":3",
  ":)",
  ":O",
  ":(",
  ":-3",
  "MISSING: Server",
  "Server is coming to your house",
  "keyboard",
  "How do i turn on the server",
  "Hang on! I am just figuring out how to turn it on",
  "Watching indian tutorials how to use server",
  "Watching Russian tutorials how to use server",
  "Watching youtube shorts… it may take a while",
  "Watching Netflix and you just seeing this screen",
  "Playing Minecraft, hang on!",
  "Currently Eeping",
  "Watching Airplanes in the sky",
  "Watching nothing ",
  "Doing nothing",
  "cold",
  "But there is a soldier with a shoulder injury!",
  "O….",
  "Ain’t no working",
  "Das is nicht richtig",
  "eek!",
  "Oof",
  "D’oh!",
  "Owch",
  "Ouch",
  "Zzzzzz",
  "Mmmmmmm",
  "Hmhmhmhmhm",
  "What?",
  "Nothing to see here",
  "Ugh",
  "I love sleeping ",
  "I love server failed",
  "500 forever!",
  "woof",
  "Data is not dating ",
  "Was?",
  "I am just too cool for that.",
  "I’m bored anyway",
  "What should i to do now",
  "Currently nothin here",
  "ooooh",
  "play Sonic Rush",
  "play Sonic Rush Adventure ",
  "Plane is circling around here",
  "ooohh what’s in here?",
  "aooooowwww",
  "Meanwhile~",
  "Pretty much dead",
  "Fix me dev plz",
  "I can’t fix you… and myself ",
  "123",
  "Hello?",
  "grrrhmmm",
  "Randomly Chosen Flight: QR778",
  "o_O",
  "0_0",
  ":(((",
  "I’ll climb up a ladder with a hammer and a nail, I’ll nail it",
  "Same old CJ.. Straight busta",
  "WOAW EXISTENCE",
  "Uh.",
  "G",
  "None",
  "Nothing",
  "Something",
  "Something but nothing",
  "Gaaarh",
  "Vote for Forgel Wanda",
  "Ich spazieren und du?",
  "I am so lazy rn",
  "Why i am even here",
  "Mrnrmrmrm",
  "grgrgrgrgrg",
  ":P",
  "Something like broken?",
  "WHAT ",
  "The flight has been delayed.",
  "Circling Circling",
  "I’m down!",
  "Negatively Working",
  "How do i turn this back",
  "I don’t have any ideas rn.",
  "Nom",
  "Gotcha!",
  "Thank you microsoft ",
  "Thank you Server provider",
  "Provider is not providing rn",
  "ID like to eep",
  "i’m soo eepy don’t mind",
  "Minding about my own business ",
  "I’ve decided to stop working ",
  "Not today",
  "Mlep",
  "Mlap",
  "Eating food rn",
  "Eating electricity",
  "Drinking Water",
  "Drinking coffee",
  "Died from the monster drink ",
  "Boeing 777",
  "Airbus A330",
  "Basically not working",
  "Mist.",
  "Totodile",
  "Love youuu",
  "Love everyone",
  "Love yourself ",
  "Don’t worry, be happy!",
  "eughghghgh",
  "Who?",
  "What?",
  "When?",
  "While?",
  "Play Deltarune ",
  "Pee Pee town",
  "Textbox 1",
  "Textbox 2",
  "Textbox 3",
  "Funny.",
  "Funny - Pulse",
  "The Climbing Mountain Song",
  "Dreamy Penguin ",
  "smooooch.",
  "OKINAWASSIVE",
  "A love we never knew.",
  "Computer Obachan ",
  "Hello people, i am space dog!",
  "FFFFF",
  "true love",
  "a stupid barber",
  "un deux trois ",
  "Get free server anywhere you go!",
  "It’s just a weather",
  "Stormy ",
  "Gyuuuuuhhhhh",
  "Gyaaahhh",
  "Guyse..?",
  "Guyse!",
  "Guyse.",
  "Is there something to do?",
  "Nothing to do.",
  "I am not choosing flights for you.",
  "Whoops, you have to put the cd to your computer",
  "Duck this one",
  "I INVENTED THE STAR PUNCH",
  "Woomy",
  "Ngyes ",
  "Veemo ",
  "Stay Fresh!",
  "Off the hook!",
  "I am getting too old for this nonsense ",
  "Server Gaming Session",
  "Skate session",
  "Session",
  "No Session rn",
  "Session is in other place",
  "Gah",
  "Mah",
  "Muh",
  "A",
  "Nein",
  "Not funny ",
  "Help!",
  "Ghost sounds",
  "Less than three ",
  "Computer Fantasy ",
  "Meet me here in IRC",
  "LOLOLOL",
  "Oh oh sexy vampire",
  "Deadbeat Boyfriend",
  "Senses ",
  "Tetetetetete",
  "Sokoly ",
  "Delta",
  "Rune",
  "Oooo",
  "E",
  "D.ogg",
  "Space Space Shooter",
  "sigh gonna get some vodka",
  "BRBRBRBRB",
  "Warioware!!!",
  "Showelware?!?!?!",
  "Hardware!!!!",
  "…..Ware!",
  "Freeware!!!",
  "Hard",
  "Comic sans",
  "Papyrus ",
  "Kris Deltarune",
  "The Vessel",
  "V E R Y  I N T E R E S T I N G.",
  "Mnah",
  "Nah",
  "You!",
  "come back later ",
  "Engine shutdown",
  "KIRYU-CHAAN!",
  "NYAGH!",
  "EEEEHEHEHE",
  "m",
  "Scratch me!",
  "Nothingware",
  "WareWare",
  "sobsob ",
  "Today weather is… looks outside",
  "Touch some grass",
  "Touch some water",
  "Touch some snow",
  "Touch some sand",
  "Touch some dirt",
  "Touch some wall",
  "Touch some floor",
  "Look at the sky and say if you see the airplane",
  "Airplanes are shiny ",
  "Ka-ching!",
  "Patapon!",
  "Pon pon pata pon",
  "Chinese ",
  "Good night",
  "Good morning",
  "Good day",
  "Good Afternoon",
  "Good Evening ",
  "Good month",
  "Good year",
  "Good century",
  "Hmmm… ",
];

const funny = ref("");
const boom = ref("");
const brandName = ref("api.ehis.gay");
onMounted(() => {
  funny.value = notFoundMessages[Math.floor(Math.random() * notFoundMessages.length)];
  boom.value = serverMessages[Math.floor(Math.random() * serverMessages.length)];
  $fetch<{ name: string }>("/branding")
    .then((data) => {
      if (data?.name) brandName.value = data.name;
    })
    .catch(() => {});
});

const info = computed(() => {
  const s = status.value;
  if (s === 400) return { title: "that request was malformed", blurb: "check the parameters and try again." };
  if (s === 401) return { title: "you need a token", blurb: "sign in / opt in and try that again." };
  if (s === 403) return { title: "you can't see this", blurb: "you don't have access to this page." };
  if (s === 404)
    return { title: "this page does not exist", blurb: funny.value || "Nothing to see here!" };
  if (s === 405) return { title: "wrong method", blurb: "that verb is not allowed here. try GET or PUT next to a /v1/boobs." };
  if (s === 408) return { title: "that took too long", blurb: "the request timed out before it finished." };
  if (s === 410) return { title: "it's gone for good", blurb: "this used to exist, it doesn't anymore." };
  if (s === 413) return { title: "that's too big", blurb: "the payload was too chunky for us." };
  if (s === 418) return { title: "i'm a teapot", blurb: "short and stout. send coffee instead." };
  if (s === 422) return { title: "can't process that", blurb: "the shape was right, the values weren't." };
  if (s === 429) return { title: "slow down a sec", blurb: "too many requests. wait a moment and retry." };
  if (s === 451) return { title: "unavailable for legal reasons", blurb: "yeah, that one. sorry." };
  if (s === 500)
    return { title: "something broke on our end", blurb: boom.value || "not your fault, give it a moment and try again!" };
  if (s === 501) return { title: "not implemented", blurb: "that feature does not exist yet." };
  if (s === 502) return { title: "bad upstream", blurb: "something between us and the data coughed. try again." };
  if (s === 503)
    return { title: "temporarily unavailable", blurb: boom.value || "we are restarting or very busy, try again in a bit." };
  if (s === 504) return { title: "upstream timed out", blurb: "the thing behind us never answered. try again." };
  if (s >= 500)
    return { title: "something broke on our end", blurb: boom.value || "not your fault, give it a moment and try again!" };
  return { title: "something went wrong", blurb: props.error?.statusMessage || "an unexpected error happened." };
});

const details = computed(() => {
  const rows: Array<{ label: string; value: string }> = [];
  const push = (label: string, value: unknown) => {
    if (value === undefined || value === null) return;
    const text = String(value).trim();
    if (!text) return;
    rows.push({ label, value: text });
  };

  push("status", status.value);
  push("status message", props.error?.statusMessage);
  push("message", props.error?.message);
  push("url", (props.error as any)?.url);
  push("data", (props.error as any)?.data ? JSON.stringify((props.error as any).data) : undefined);

  return rows;
});

const retryable = computed(() => status.value !== 404);

useHead({ title: () => `${status.value} · ${brandName.value}` });

function goHome() {
  clearError({ redirect: "/" });
}

function tryAgain() {
  clearError();
  if (import.meta.client) window.location.reload();
}
</script>

<template>
  <NuxtLayout name="default">
    <v-sheet border rounded="0" class="pa-5 text-center">
      <p class="code">{{ status }}</p>
      <p class="text-body-1 mb-1">{{ info.title }}</p>
      <p class="text-body-2 text-medium-emphasis mb-5">{{ info.blurb }}</p>

      <div class="d-flex flex-column ga-2">
        <v-btn v-if="retryable" variant="outlined" block @click="tryAgain">try again</v-btn>
        <v-btn variant="outlined" block @click="goHome">take me home</v-btn>
      </div>

      <div v-if="details.length" class="details mt-5 text-left">
        <div v-for="row in details" :key="row.label" class="detail">
          <div class="detail-label">{{ row.label }}</div>
          <div class="detail-value mono">{{ row.value }}</div>
        </div>
      </div>
    </v-sheet>
  </NuxtLayout>
</template>

<style scoped>
.code {
  font-size: 3.5rem;
  font-weight: 800;
  letter-spacing: -0.06em;
  line-height: 1;
  margin-bottom: 0.75rem;
  color: #8a7f74;
}

.details {
  border: 1px solid #2a2c33;
  border-radius: 4px;
  padding: 10px 12px;
  max-height: 240px;
  overflow-y: auto;
  background: #1a1b20;
}

.detail + .detail {
  margin-top: 8px;
}

.detail-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #8d8781;
  margin-bottom: 2px;
}

.detail-value {
  font-size: 0.78rem;
  color: #cfc9c2;
  white-space: pre-wrap;
  word-break: break-word;
}

.mono {
  font-family: ui-monospace, monospace;
  word-break: break-word;
}
</style>