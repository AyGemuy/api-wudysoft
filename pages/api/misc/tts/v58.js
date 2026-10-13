import axios from "axios";
import WebSocket from "ws";

class CartesiaTTS {
  constructor() {
    this.token_url = "https://backend.cartesia.ai/access-token/site";
    this.ws_url = "wss://api.cartesia.ai/tts/websocket";
    this.cartesia_version = "2026-03-01";
    this.cache = {};

    this.default_voices = {
      id: "b441c4fd-4910-4c55-ae56-f0291057e2cc",
      en: "6ccbfb76-1fc6-48f7-b71d-91ac6298247b",
      ar: "e3087ad8-7018-4154-9a87-11577f916cd4",
      bn: "2ba861ea-7cdc-43d1-8608-4045b5a41de5",
      bg: "fcbecbcc-0cef-4615-8b5a-712fe1b39dd0",
      fr: "0418348a-0ca2-4e90-9986-800fb8b3bbc0",
      zh: "c59c247b-6aa9-4ab6-91f9-9eabea7dc69e",
      cs: "bdc4a3ce-2e22-4398-8cd6-76b7160d2298",
      da: "c323c793-41f9-47b8-99dc-9b44b0440b84",
      nl: "9e8db62d-056f-47f3-b3b6-1b05767f9176",
      fi: "65c34eec-42c9-4a75-a8bd-b676fb847b72",
      ka: "dbebd077-80cb-4bcf-b43b-4552f96341bb",
      de: "b7187e84-fe22-4344-ba4a-bc013fcb533e",
      el: "50849023-76e9-46c7-af52-9ec39888a165",
      he: "3e32f3c5-9ac0-4192-9994-87fdb277120f",
      hi: "791d5162-d5eb-40f0-8189-f19db44611d8",
      hu: "36e0c00b-1bfd-4ad7-a0e8-928d4cadca00",
      it: "d718e944-b313-4998-b011-d1cc078d4ef3",
      ja: "59d4fd2f-f5eb-4410-8105-58db7661144f",
      kn: "6baae46d-1226-45b5-a976-c7f9b797aae2",
      ko: "15628352-2ede-4f1b-89e6-ceda0c983fbc",
      ms: "8281db18-6ac5-47bb-91a8-ce23a1f1d951",
      ml: "b426013c-002b-4e89-8874-8cd20b68373a",
      mr: "f227bc18-3704-47fe-b759-8c78a450fdfa",
      no: "d6dca1b6-cdd8-4e9c-823c-e03979261740",
      or: "701b0221-b708-4e4e-9905-233976f664bf",
      pl: "ea7b5eee-39d9-40b0-b241-1910cbca9c62",
      pt: "1cf751f6-8749-43ab-98bd-230dd633abdb",
      pa: "8bacd442-a107-4ec1-b6f1-2fcb3f6f4d56",
      ro: "3f64ef99-d87b-4b51-b217-df7351f7886a",
      ru: "064b17af-d36b-4bfb-b003-be07dba1b649",
      sk: "ca590fdc-df56-4d2e-94a4-ef5b423c7ddf",
      es: "79743797-2087-422f-8dc7-86f9efca85f1",
      sv: "f852eb8d-a177-48cd-bf63-7e4dcab61a36",
      tl: "9261664a-c3d0-4200-9038-5466bcf3a09c",
      ta: "d2870b91-1b4c-47ab-81a8-3718d8e9c222",
      te: "07bc462a-c644-49f1-baf7-82d5599131be",
      th: "5de076e9-7b28-4442-b279-e7d80d573505",
      tr: "0f95596c-09c4-4418-99fe-5c107e0713c0",
      uk: "05ffab9c-d380-4909-8375-cd12f59238c3",
      ur: "aca48de1-55e4-40e7-979b-6973f5dc5b4c",
      vi: "0e58d60a-2f1a-4252-81bd-3db6af45fb41"
    };

    this.voices_catalog = [
      { id: "d3a5be1f-f963-4c85-bfcc-c3b20903d967", name: "Adel - Soft Anchor", gender: "masculine", language: "ar" },
      { id: "0528c162-5439-4dde-a4b8-a3a9cb62edf5", name: "Alia - Poised Host", gender: "feminine", language: "ar" },
      { id: "6304c635-6681-4f9e-85b6-a97f4d26461a", name: "Amira - Dreamy Whisperer", gender: "feminine", language: "ar" },
      { id: "218a8026-7a26-4dc5-9753-9e75dffe1ea6", name: "Dina - Trusted Advisor", gender: "feminine", language: "ar" },
      { id: "731ace69-ee17-41bc-8c6f-665c9f1db95c", name: "Fatima - Graceful Guide", gender: "feminine", language: "ar" },
      { id: "664aec8a-64a4-4437-8a0b-a61aa4f51fe6", name: "Hassan - Authoritative Narrator", gender: "masculine", language: "ar" },
      { id: "002622d8-19d0-4567-a16a-f99c7397c062", name: "Huda - Approachable Speaker", gender: "feminine", language: "ar" },
      { id: "d663e679-b321-43f5-8c98-3f41172a9480", name: "Jana - Knowledgeable Advisor", gender: "feminine", language: "ar" },
      { id: "b068aef8-2c18-4a1d-bafb-e8f6d2239d60", name: "Khaled - Keen Problem-Solver", gender: "masculine", language: "ar" },
      { id: "b0aa4612-81d2-4df3-9730-3fc064754b1f", name: "Khalid - Bright Energy", gender: "masculine", language: "ar" },
      { id: "64a941ac-07ac-462c-a81c-008e353dd83e", name: "Layan - Clarity Provider", gender: "feminine", language: "ar" },
      { id: "cb88df49-5c12-440b-b282-87ccb9b49245", name: "Majid - Workflow Clarifier", gender: "masculine", language: "ar" },
      { id: "9825cf5f-6aff-412a-80c5-bc58a8d55bc4", name: "Maryam - Friendly Voice", gender: "feminine", language: "ar" },
      { id: "6625760e-eab7-4ab8-aa49-9230425b5be4", name: "Nada - Diligent Teller", gender: "feminine", language: "ar" },
      { id: "fc923f89-1de5-4ddf-b93c-6da2ba63428a", name: "Nour - Engaging Speaker", gender: "feminine", language: "ar" },
      { id: "e3087ad8-7018-4154-9a87-11577f916cd4", name: "Omar - High-Energy Presenter", gender: "masculine", language: "ar" },
      { id: "f9f9f472-6247-4403-9abe-616f7c407c63", name: "Raed - Workflow Analyst", gender: "masculine", language: "ar" },
      { id: "98bf39ce-b44a-49d7-9794-fb9a9329fd11", name: "Rania - Spirited Storyteller", gender: "feminine", language: "ar" },
      { id: "92f27ee5-d8b9-4c0a-a0c2-f401f6ab0a72", name: "Reem - Solution Provider", gender: "feminine", language: "ar" },
      { id: "db873303-3a70-4d9d-867a-0d70a6377195", name: "Tariq - Wise Advisor", gender: "masculine", language: "ar" },
      { id: "f1cdfb4a-bf7d-4e83-916e-8f0802278315", name: "Walid - Steady Presence", gender: "masculine", language: "ar" },
      { id: "9cbad5f7-fbf6-4416-a22f-1ecc75ad40a2", name: "Youssef - Clear Communicator", gender: "masculine", language: "ar" },
      { id: "40f9b5d1-bc79-43a6-b5cc-1c692b3b40d2", name: "Zain - Dynamic Presenter", gender: "masculine", language: "ar" },
      { id: "d132064c-b931-4a80-bf0d-02a331ec4572", name: "Georgi - Conversationalist", gender: "masculine", language: "bg" },
      { id: "fcbecbcc-0cef-4615-8b5a-712fe1b39dd0", name: "Ivana - Instruction Provider", gender: "feminine", language: "bg" },
      { id: "48b9e1de-e2fa-4914-8b32-31c437813548", name: "Ananya - Paced Helper", gender: "feminine", language: "bn" },
      { id: "314be1d2-3d14-468d-be40-08a1af7df49d", name: "Kian - Thoughtful Narrator", gender: "masculine", language: "bn" },
      { id: "59ba7dee-8f9a-432f-a6c0-ffb33666b654", name: "Pooja - Everyday Assistant", gender: "feminine", language: "bn" },
      { id: "2ba861ea-7cdc-43d1-8608-4045b5a41de5", name: "Rubel - City Guide", gender: "masculine", language: "bn" },
      { id: "ddf9ec71-3337-4a8a-a318-9a42f72433e2", name: "Rupam - Detailed Analyst", gender: "masculine", language: "bn" },
      { id: "82db1f84-5b96-4364-b04a-4c7ff80e2f8a", name: "Jan - Capable Coordinator", gender: "masculine", language: "cs" },
      { id: "bdc4a3ce-2e22-4398-8cd6-76b7160d2298", name: "Jana - Crisp Conversationalist", gender: "feminine", language: "cs" },
      { id: "0b6d3ccb-f421-4e49-80f7-4bfa39f6eb8e", name: "Marek - Steady Specialist", gender: "masculine", language: "cs" },
      { id: "b66b3a19-31b3-401f-8b08-40d46a61e4f1", name: "Milena - Composed Clarifier", gender: "feminine", language: "cs" },
      { id: "89266bab-6e15-455d-8654-e18c440b0656", name: "Petr - Pastor", gender: "masculine", language: "cs" },
      { id: "f8685385-96f6-4c12-8520-49e4914bcbfe", name: "Tereza - Decisive Agent", gender: "feminine", language: "cs" },
      { id: "c323c793-41f9-47b8-99dc-9b44b0440b84", name: "Katrine - Calm Caregiver", gender: "feminine", language: "da" },
      { id: "eb929394-68e7-4e08-bd2f-e7055728a5e1", name: "Mette - Polished Facilitator", gender: "feminine", language: "da" },
      { id: "926e0766-f380-4d77-aeb0-9aa4ebb16b38", name: "Soren - Executive Voice", gender: "masculine", language: "da" },
      { id: "a466f9e2-28eb-4bb7-925c-8e8984950700", name: "Søren - Steady Strategist", gender: "masculine", language: "da" },
      { id: "cd7b67f4-22a4-49a0-a197-3fa16f7e64d4", name: "Alexander - Reliable Advisor", gender: "masculine", language: "de" },
      { id: "38aabb6a-f52b-4fb0-a3d1-988518f4dc06", name: "Alina - Engaging Assistant", gender: "feminine", language: "de" },
      { id: "db229dfe-f5de-4be4-91fd-7b077c158578", name: "Andreas - Recorder", gender: "masculine", language: "de" },
      { id: "57a3a9e0-a91c-4c94-a2bb-e6cbab3ae649", name: "Clemens - Precise Instructor", gender: "masculine", language: "de" },
      { id: "2be00b67-d53f-4eb5-89e7-96c224d56fbc", name: "Dieter - Commercial Man", gender: "masculine", language: "de" },
      { id: "d1cbea67-e4d3-47cd-be2a-2bd4e646b002", name: "Henrik - Steady Analyst", gender: "masculine", language: "de" },
      { id: "f6f315e4-4fb3-4440-92ea-2edb01f9bf1b", name: "Hermann - Businessman", gender: "masculine", language: "de" },
      { id: "3f4ade23-6eb4-4279-ab05-6a144947c4d5", name: "Karin - Companion", gender: "feminine", language: "de" },
      { id: "2578354e-4b18-4d28-832c-5943344b7085", name: "Klara - Empathetic Voice", gender: "feminine", language: "de" },
      { id: "24c61c42-b538-468e-a9ad-16c7a032c9cb", name: "Klaus - Archivist", gender: "masculine", language: "de" },
      { id: "1ade29fc-6b82-4607-9e70-361720139b12", name: "Lea - Breezy Voice", gender: "feminine", language: "de" },
      { id: "4ab1ff51-476d-42bb-8019-4d315f7c0c05", name: "Lena - Muse", gender: "feminine", language: "de" },
      { id: "adc919b3-6ebf-47fd-8a46-27c5169d6d94", name: "Leni - Daymaker", gender: "feminine", language: "de" },
      { id: "0b66a153-548f-4f2c-b734-09a13b0bd163", name: "Lorelei - Helpful Guide", gender: "feminine", language: "de" },
      { id: "e00dd3df-19e7-4cd4-827a-7ff6687b6954", name: "Lukas - Professional", gender: "masculine", language: "de" },
      { id: "9b4d08b6-0494-4301-ab92-9150f4ee2718", name: "Marlene - Elegant Speaker", gender: "feminine", language: "de" },
      { id: "4ad22058-7cb6-402c-a115-196cbfc25dce", name: "Moritz - Modern Communicator", gender: "masculine", language: "de" },
      { id: "afa425cf-5489-4a09-8a3f-d3cb1f82150d", name: "Nico - Friendly Agent", gender: "masculine", language: "de" },
      { id: "d42fc8d7-efdd-44df-bb2e-a6e093601917", name: "Oskar - Steady Advisor", gender: "masculine", language: "de" },
      { id: "6d4b1416-8d54-4d94-a788-8a802c086544", name: "Sabine - Firm Newscaster", gender: "feminine", language: "de" },
      { id: "b7187e84-fe22-4344-ba4a-bc013fcb533e", name: "Sebastian - Orator", gender: "masculine", language: "de" },
      { id: "384b625b-da5d-49e8-a76d-a2855d4f31eb", name: "Thomas - Anchor", gender: "masculine", language: "de" },
      { id: "b9de4a89-2257-424b-94c2-db18ba68c81a", name: "Viktoria - Phone Conversationalist", gender: "feminine", language: "de" },
      { id: "50849023-76e9-46c7-af52-9ec39888a165", name: "Despina - Motherly Woman", gender: "feminine", language: "el" },
      { id: "b45eba5b-2215-4da7-9c7c-121c95ed7b81", name: "Nikos - Radio Storyteller", gender: "masculine", language: "el" },
      { id: "a0e8430e-1267-4a4d-baa5-a5d5e53122a9", name: "Aila - Paced Helper", gender: "feminine", language: "en" },
      { id: "2747b6cf-fa34-460c-97db-267566918881", name: "Allie - Natural Conversationalist", gender: "feminine", language: "en" },
      { id: "b60048c2-abb5-43fa-b403-90dce232e55e", name: "Amanda - Warm Guide", gender: "feminine", language: "en" },
      { id: "ef191366-f52f-447a-a398-ed8c0f2943a1", name: "Archie - Approachable Mate", gender: "masculine", language: "en" },
      { id: "12e85709-099c-480a-ba3e-875c41a9611a", name: "Arlo - Service Specialist", gender: "masculine", language: "en" },
      { id: "bb7e8daa-8b79-47a2-8408-a7a1cc72b53c", name: "Arthur - Polished Advisor", gender: "masculine", language: "en" },
      { id: "47c38ca4-5f35-497b-b1a3-415245fb35e1", name: "Daniel - Modern Assistant", gender: "masculine", language: "en" },
      { id: "2a12b36c-7f9b-4c3a-9f7a-72731b15323a", name: "Ella - Caring Scout", gender: "feminine", language: "en" },
      { id: "f6ff7c0c-e396-40a9-a70b-f7607edb6937", name: "Emma - Customer Care Line", gender: "feminine", language: "en" },
      { id: "62ae83ad-4f6a-430b-af41-a9bede9286ca", name: "Gemma - Decisive Agent", gender: "feminine", language: "en" },
      { id: "a5136bf9-224c-4d76-b823-52bd5efcffcc", name: "Jameson - Easygoing Support", gender: "masculine", language: "en" },
      { id: "0ea47942-be0b-4bc7-a1bf-5dba008dc1cc", name: "Owen - Support Anchor", gender: "masculine", language: "en" },
      { id: "db6b0ed5-d5d3-463d-ae85-518a07d3c2b4", name: "Skylar - Friendly Guide", gender: "feminine", language: "en" },
      { id: "6ccbfb76-1fc6-48f7-b71d-91ac6298247b", name: "Tessa - Kind Companion", gender: "feminine", language: "en" },
      { id: "f4d6bb07-f876-4464-ba70-cd48d8701890", name: "Adriana - Bright Entertainer", gender: "feminine", language: "es" },
      { id: "35b2cfc1-e6fb-4d69-a598-c1780612be4a", name: "Darío - Steady Operator", gender: "masculine", language: "es" },
      { id: "a7beff01-8f8b-4809-bfe6-e2166e57e0c2", name: "Iria - Thoughtful Communicator", gender: "feminine", language: "es" },
      { id: "9b67072c-d46c-465d-87dc-f7a1c6db2bf3", name: "Ramon - Calm Coordinator", gender: "masculine", language: "es" },
      { id: "79743797-2087-422f-8dc7-86f9efca85f1", name: "Spanish - Standard", gender: "feminine", language: "es" },
      { id: "3597a26f-80ef-4bd5-8101-9699bc764917", name: "Ximena - Calm Navigator", gender: "feminine", language: "es" },
      { id: "65c34eec-42c9-4a75-a8bd-b676fb847b72", name: "Helmi - Warm Friend", gender: "feminine", language: "fi" },
      { id: "7849a11e-4107-44ae-bc7e-77bea41ec019", name: "Matti - Measured Manager", gender: "masculine", language: "fi" },
      { id: "2835e382-643b-4ac6-8f6c-74df549a7ad0", name: "Milla - Modern Communicator", gender: "feminine", language: "fi" },
      { id: "c6ccfe32-6bee-484a-a8a2-7a51bee93f99", name: "Étienne - Precise Specialist", gender: "masculine", language: "fr" },
      { id: "d9f4af15-c402-4f50-bbda-d8823d028d6a", name: "Henri - Express Host", gender: "masculine", language: "fr" },
      { id: "7c58f4a4-a72c-42fa-a503-41b9408820f3", name: "Inès - Poised Communicator", gender: "feminine", language: "fr" },
      { id: "3b7d569e-01fc-45ef-b74b-29460956c691", name: "Josette - Frontline Helper", gender: "feminine", language: "fr" },
      { id: "187d1cc5-a771-4ccd-9110-9df8c4e39499", name: "Mika - Empathetic Friend", gender: "feminine", language: "fr" },
      { id: "0418348a-0ca2-4e90-9986-800fb8b3bbc0", name: "Antoine - Stern Man", gender: "masculine", language: "fr" },
      { id: "dbebd077-80cb-4bcf-b43b-4552f96341bb", name: "Levan - Support Guide", gender: "masculine", language: "ka" },
      { id: "ebc02c0d-61fd-48f2-a6c9-0d6683b7d466", name: "Ayala - Expert Narrator", gender: "feminine", language: "he" },
      { id: "3e32f3c5-9ac0-4192-9994-87fdb277120f", name: "Noam - Broadcaster", gender: "masculine", language: "he" },
      { id: "5283efe8-07d1-4e3a-b615-2ae4a81c1b73", name: "Kriti - Clear Explainer", gender: "feminine", language: "hi" },
      { id: "c7be5dde-c1e6-4ebe-9096-ddc4b4edb1cc", name: "Shreeraj - Professional Server", gender: "masculine", language: "hi" },
      { id: "791d5162-d5eb-40f0-8189-f19db44611d8", name: "Ayush - Friendly Neighbor", gender: "masculine", language: "hi" },
      { id: "4c5c7be8-6b3b-4c62-b915-c54d049c198f", name: "Bence - Focused Facilitator", gender: "masculine", language: "hu" },
      { id: "e97c3b37-1aa5-46af-afb7-9545086aaa92", name: "Eszter - Customer Companion", gender: "feminine", language: "hu" },
      { id: "36e0c00b-1bfd-4ad7-a0e8-928d4cadca00", name: "Gabor - Reassuring Voice", gender: "masculine", language: "hu" },
      { id: "a053f6bc-7df4-40de-96d4-de026bc47ce8", name: "Andi - Dynamic Presenter", gender: "masculine", language: "id" },
      { id: "8f703c45-8cb6-4e0c-8015-5e8a9e260a8a", name: "Anisa - Customer Care", gender: "feminine", language: "id" },
      { id: "74546efd-3ac5-4c41-ba59-4756227f429a", name: "Citra - Interactive Agent", gender: "feminine", language: "id" },
      { id: "04b567df-2923-4b0c-896b-4b7df0a07e1a", name: "Galang - Serene Communicator", gender: "masculine", language: "id" },
      { id: "f3b7c445-d015-40f7-a665-9595e0bc0c90", name: "Intan - Service Representative", gender: "feminine", language: "id" },
      { id: "e78f5fbd-2445-42a2-bddc-2dee624330eb", name: "Ratna - Empathetic Responder", gender: "feminine", language: "id" },
      { id: "6a3fe952-63f8-4c99-865a-44887175ea26", name: "Risa - Compassionate Helper", gender: "feminine", language: "id" },
      { id: "9076f14a-5602-48a7-bfd1-67ef9b40dd6d", name: "Safira - Digital Host", gender: "feminine", language: "id" },
      { id: "b441c4fd-4910-4c55-ae56-f0291057e2cc", name: "Siti - Ad Narrator", gender: "feminine", language: "id" },
      { id: "d718e944-b313-4998-b011-d1cc078d4ef3", name: "Liv - Casual Friend", gender: "feminine", language: "it" },
      { id: "31c55968-a9f4-4115-8831-3a16952179c8", name: "Ayumi - Sales Guide", gender: "feminine", language: "ja" },
      { id: "aa3ccc4a-cfd8-405c-acf5-1873a527b006", name: "Naoki - Polished Professional", gender: "masculine", language: "ja" },
      { id: "59d4fd2f-f5eb-4410-8105-58db7661144f", name: "Yuki - Calm Woman", gender: "feminine", language: "ja" },
      { id: "7c6219d2-e8d2-462c-89d8-7ecba7c75d65", name: "Divya - Joyful Narrator", gender: "feminine", language: "kn" },
      { id: "6baae46d-1226-45b5-a976-c7f9b797aae2", name: "Prakash - Instructor", gender: "masculine", language: "kn" },
      { id: "4dd4630e-19e0-4243-bca0-676ff85119b7", name: "Haeun - Polished Presence", gender: "feminine", language: "ko" },
      { id: "e1717dc3-b87b-4720-aa7f-b6db290e0609", name: "Taehyun - Friendly Host", gender: "masculine", language: "ko" },
      { id: "15628352-2ede-4f1b-89e6-ceda0c983fbc", name: "Jiwoo - Service Specialist", gender: "feminine", language: "ko" },
      { id: "83604597-55fa-4ccc-8357-730b313f353f", name: "Aisyah - Chat Partner", gender: "feminine", language: "ms" },
      { id: "8281db18-6ac5-47bb-91a8-ce23a1f1d951", name: "Faiz - Family Guide", gender: "masculine", language: "ms" },
      { id: "b426013c-002b-4e89-8874-8cd20b68373a", name: "Latha - Friendly Host", gender: "feminine", language: "ml" },
      { id: "5c32dce6-936a-4892-b131-bafe474afe5f", name: "Anika - Enthusiastic Seller", gender: "feminine", language: "mr" },
      { id: "f227bc18-3704-47fe-b759-8c78a450fdfa", name: "Suresh - Instruction Voice", gender: "masculine", language: "mr" },
      { id: "af482421-80f4-4379-b00c-a118def29cde", name: "Lucas - Storyteller", gender: "masculine", language: "nl" },
      { id: "0eb213fe-4658-45bc-9442-33a48b24b133", name: "Sanne - Clear Companion", gender: "feminine", language: "nl" },
      { id: "9e8db62d-056f-47f3-b3b6-1b05767f9176", name: "Dutch - Standard", gender: "feminine", language: "nl" },
      { id: "4f7b1820-6263-4615-87a7-b105768d8f64", name: "Kari - Crisp Coordinator", gender: "feminine", language: "no" },
      { id: "d6dca1b6-cdd8-4e9c-823c-e03979261740", name: "Lars - Casual Conversationalist", gender: "masculine", language: "no" },
      { id: "701b0221-b708-4e4e-9905-233976f664bf", name: "Aniket Mishra - Presenter", gender: "masculine", language: "or" },
      { id: "b2a31ee9-7373-4122-852d-eec9576e2fa6", name: "Rian - Supportive Communicator", gender: "feminine", language: "or" },
      { id: "d358377a-cd1d-45c5-abd0-701314e36cbe", name: "Marcin - Charismatic Presenter", gender: "masculine", language: "pl" },
      { id: "dcf62f33-7cff-4f20-85b2-2efaa68cbc32", name: "Zofia - Audiobook Muse", gender: "feminine", language: "pl" },
      { id: "ea7b5eee-39d9-40b0-b241-1910cbca9c62", name: "Kasia - Natural Conversationalist", gender: "feminine", language: "pl" },
      { id: "9904416a-0831-44ea-b8ee-5f145e8f9bbf", name: "Alice - Informative Speaker", gender: "feminine", language: "pt" },
      { id: "616c64d7-f541-436b-9b8d-e79cfbe19ef9", name: "Felipe - Warm Assistant", gender: "masculine", language: "pt" },
      { id: "1cf751f6-8749-43ab-98bd-230dd633abdb", name: "Ana Paula - Marketer", gender: "feminine", language: "pt" },
      { id: "8bacd442-a107-4ec1-b6f1-2fcb3f6f4d56", name: "Gurpreet - Companion", gender: "masculine", language: "pa" },
      { id: "991c62ce-631f-48b0-8060-2a0ebecbd15b", name: "Jaspreet - Commercial Woman", gender: "feminine", language: "pa" },
      { id: "34acfaee-c556-41ee-a5f6-c687fb20357c", name: "Andrada - Steady Speaker", gender: "feminine", language: "ro" },
      { id: "3f64ef99-d87b-4b51-b217-df7351f7886a", name: "Andrei - Conversationalist Guy", gender: "masculine", language: "ro" },
      { id: "1e4176b1-3db9-44d6-a601-4fe68b041942", name: "Sergei - Steady Supporter", gender: "masculine", language: "ru" },
      { id: "064b17af-d36b-4bfb-b003-be07dba1b649", name: "Tatiana - Friendly Storyteller", gender: "feminine", language: "ru" },
      { id: "abf68668-6549-462c-8426-1fa7b466b91d", name: "Katarina - Friendly Sales", gender: "feminine", language: "sk" },
      { id: "ca590fdc-df56-4d2e-94a4-ef5b423c7ddf", name: "Peter - Narrator Man", gender: "masculine", language: "sk" },
      { id: "bcdcad6d-4eb6-4a71-89fd-1ae2ce9f95d8", name: "Freja - Informative Host", gender: "feminine", language: "sv" },
      { id: "ebe0038b-1790-40bd-98cd-924313e58d3b", name: "Vidar - Supportive Voice", gender: "masculine", language: "sv" },
      { id: "f852eb8d-a177-48cd-bf63-7e4dcab61a36", name: "Ingrid - Peaceful Guide", gender: "feminine", language: "sv" },
      { id: "8bfb1d08-a77a-4a7c-a4b7-af377380c6eb", name: "Joy - Crisp Narrator", gender: "feminine", language: "tl" },
      { id: "9261664a-c3d0-4200-9038-5466bcf3a09c", name: "Luz - Casual Speaker", gender: "feminine", language: "tl" },
      { id: "fb7d8d97-9730-4165-bd79-36b5ce61b5f2", name: "Janani - Calm Professional", gender: "feminine", language: "ta" },
      { id: "d2870b91-1b4c-47ab-81a8-3718d8e9c222", name: "Arun - Lively Voice", gender: "masculine", language: "ta" },
      { id: "07bc462a-c644-49f1-baf7-82d5599131be", name: "Sindhu - Conversational Partner", gender: "feminine", language: "te" },
      { id: "4ff0f045-c140-4aa3-9210-529083f86fca", name: "Supannee - Support Concierge", gender: "feminine", language: "th" },
      { id: "5de076e9-7b28-4442-b279-e7d80d573505", name: "Somchai - Star", gender: "masculine", language: "th" },
      { id: "fa7bfcdc-603c-4bf1-a600-a371400d2f8c", name: "Leyla - Story Companion", gender: "feminine", language: "tr" },
      { id: "c1cfee3d-532d-47f8-8dd2-8e5b2b66bf1d", name: "Taylan - Expressive Voice", gender: "masculine", language: "tr" },
      { id: "0f95596c-09c4-4418-99fe-5c107e0713c0", name: "Azra - Service Specialist", gender: "feminine", language: "tr" },
      { id: "05ffab9c-d380-4909-8375-cd12f59238c3", name: "Oleh - Professional Guy", gender: "masculine", language: "uk" },
      { id: "41e97793-a58d-40b7-8430-83465e186f94", name: "Aryan - Order Verifier", gender: "masculine", language: "ur" },
      { id: "aca48de1-55e4-40e7-979b-6973f5dc5b4c", name: "Zara - Customer Guide", gender: "feminine", language: "ur" },
      { id: "8e8f222d-c817-4cc5-822b-8bf76ca7e98d", name: "Lien - Gentle Coordinator", gender: "feminine", language: "vi" },
      { id: "0e58d60a-2f1a-4252-81bd-3db6af45fb41", name: "Minh - Conversational Partner", gender: "masculine", language: "vi" },
      { id: "6eb8965c-e295-47bd-a9e4-3eeebb3abcff", name: "Jing - Clear Coordinator", gender: "feminine", language: "zh" },
      { id: "c59c247b-6aa9-4ab6-91f9-9eabea7dc69e", name: "Tao - Lecturer", gender: "masculine", language: "zh" }
    ];
  }

  val_str(v, name, req = true) {
    try {
      const clean = v !== undefined && v !== null ? String(v).trim() : "";
      if (req && !clean) throw new Error(`Parameter "${name}" wajib diisi dan tidak boleh kosong.`);
      return clean;
    } catch (err) {
      console.log(`[ERROR] val_str: ${err?.message}`);
      throw err;
    }
  }

  async ini() {
    try {
      const now = Math.floor(Date.now() / 1e3);
      if (this.cache["token"] && this.cache["token_exp"] > now + 30) {
        return this.cache["token"];
      }

      console.log("[PROSES] Mengambil token sesi Cartesia...");
      const res = await axios.get(this.token_url, {
        headers: {
          Origin: "https://www.cartesia.ai",
          Referer: "https://www.cartesia.ai/",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
        },
        timeout: 15e3
      });

      const token = res?.data?.token || "";
      if (!token) throw new Error("Gagal memperoleh token situs Cartesia");

      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
          this.cache["token_exp"] = payload?.exp || now + 60;
        } else {
          this.cache["token_exp"] = now + 60;
        }
      } catch {
        this.cache["token_exp"] = now + 60;
      }

      this.cache["token"] = token;
      console.log("[PROSES] Token Cartesia berhasil diperbarui.");
      return token;
    } catch (err) {
      console.log(`[ERROR] Inisialisasi token gagal: ${err?.message || err}`);
      throw new Error(`Inisialisasi token gagal: ${err?.message || err}`);
    }
  }

  pcm_f32_to_wav(buffers, sample_rate = 44100) {
    try {
      const combined = Buffer.concat(buffers);
      const total_samples = combined.length / 4;
      const pcm16 = Buffer.alloc(total_samples * 2);

      for (let i = 0; i < total_samples; i++) {
        let sample = combined.readFloatLE(i * 4);
        sample = Math.max(-1, Math.min(1, sample));
        const int16 = sample < 0 ? sample * 32768 : sample * 32767;
        pcm16.writeInt16LE(Math.floor(int16), i * 2);
      }

      const wav_header = Buffer.alloc(44);
      wav_header.write("RIFF", 0);
      wav_header.writeUInt32LE(36 + pcm16.length, 4);
      wav_header.write("WAVE", 8);
      wav_header.write("fmt ", 12);
      wav_header.writeUInt32LE(16, 16);
      wav_header.writeUInt16LE(1, 20);
      wav_header.writeUInt16LE(1, 22);
      wav_header.writeUInt32LE(sample_rate, 24);
      wav_header.writeUInt32LE(sample_rate * 2, 28);
      wav_header.writeUInt16LE(2, 32);
      wav_header.writeUInt16LE(16, 34);
      wav_header.write("data", 36);
      wav_header.writeUInt32LE(pcm16.length, 40);

      return Buffer.concat([wav_header, pcm16]);
    } catch (err) {
      console.log(`[ERROR] Konversi WAV gagal: ${err?.message}`);
      throw err;
    }
  }

  async voice_list({ lang, ...rest } = {}) {
    try {
      console.log("[PROSES] Mengambil voice_list Cartesia...");
      const target_lang = lang ? this.val_str(lang, "lang", false).toLowerCase() : "";

      let voices = this.voices_catalog;
      if (target_lang) {
        voices = voices.filter(v => v.language.toLowerCase() === target_lang);
      }

      const available_languages = [...new Set(this.voices_catalog.map(v => v.language))].sort();

      return {
        status: true,
        result: {
          total_voices: voices.length,
          voices: voices,
          languages: available_languages,
          default_voices: this.default_voices
        }
      };
    } catch (err) {
      console.log(`[ERROR] voice_list: ${err?.message || err}`);
      return {
        status: false,
        result: {
          message: err?.message || "Gagal mengambil daftar suara Cartesia"
        }
      };
    }
  }

  async create({
    text,
    voice,
    lang = "id",
    model = "sonic-3.6",
    sample_rate = 44100,
    ...rest
  } = {}) {
    try {
      const content = this.val_str(text, "text", true);
      const chosen_lang = this.val_str(lang, "lang", false).toLowerCase() || "id";
      const chosen_model = this.val_str(model, "model", false) || "sonic-3.6";
      const s_rate = Number(sample_rate) || 44100;

      let voice_id = "";
      if (voice) {
        const v_str = String(voice).trim().toLowerCase();
        const found = this.voices_catalog.find(v => v.id.toLowerCase() === v_str || v.name.toLowerCase().includes(v_str));
        voice_id = found ? found.id : String(voice).trim();
      } else {
        voice_id = this.default_voices[chosen_lang] || this.default_voices["id"];
      }

      const matched_info = this.voices_catalog.find(v => v.id.toLowerCase() === voice_id.toLowerCase());

      const token = await this.ini();
      const context_id = `ctx_${Math.random().toString(36).substring(2, 12)}`;

      console.log(`[PROSES] Menghubungi WebSocket Cartesia (Model: ${chosen_model}, Voice: ${voice_id}, Lang: ${chosen_lang})...`);

      const ws_endpoint = `${this.ws_url}?cartesia_version=${this.cartesia_version}&api_key=${encodeURIComponent(token)}`;

      const audio_chunks = [];

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (ws?.readyState === WebSocket.OPEN) ws.close();
          reject(new Error("Timeout streaming audio dari Cartesia WebSocket (45 detik)"));
        }, 45e3);

        const ws = new WebSocket(ws_endpoint, {
          headers: {
            Origin: "https://www.cartesia.ai",
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
          }
        });

        ws.on("open", () => {
          console.log("[PROSES] WebSocket terkoneksi, mengirim payload sintesis...");
          const payload = {
            model_id: chosen_model,
            transcript: content,
            voice: {
              mode: "id",
              id: voice_id
            },
            output_format: {
              container: "raw",
              encoding: "pcm_f32le",
              sample_rate: s_rate
            },
            context_id: context_id,
            language: chosen_lang
          };
          ws.send(JSON.stringify(payload));
        });

        ws.on("message", (msg) => {
          try {
            const data = JSON.parse(msg.toString());
            if (data?.type === "chunk" && data?.data) {
              const chunk = Buffer.from(data.data, "base64");
              audio_chunks.push(chunk);
            } else if (data?.type === "done" && data?.done) {
              clearTimeout(timeout);
              ws.close();
              resolve();
            } else if (data?.error) {
              clearTimeout(timeout);
              ws.close();
              reject(new Error(data?.error || "Kesalahan pada stream Cartesia"));
            }
          } catch (e) {
            clearTimeout(timeout);
            ws.close();
            reject(e);
          }
        });

        ws.on("error", (err) => {
          clearTimeout(timeout);
          reject(err);
        });

        ws.on("close", (code) => {
          clearTimeout(timeout);
          if (audio_chunks.length > 0) {
            resolve();
          } else if (code !== 1000) {
            reject(new Error(`Koneksi WebSocket terputus sebelum selesai (Code: ${code})`));
          }
        });
      });

      if (!audio_chunks.length) {
        throw new Error("Tidak ada audio chunk yang diterima dari Cartesia");
      }

      console.log(`[PROSES] Mengonversi ${audio_chunks.length} raw chunk ke format WAV...`);
      const wav_buffer = this.pcm_f32_to_wav(audio_chunks, s_rate);
      const audio_b64 = wav_buffer.toString("base64");

      console.log(`[PROSES] Sintesis suara selesai (${wav_buffer.length} bytes).`);

      return {
        status: true,
        result: {
          model: chosen_model,
          voice_id: voice_id,
          voice_name: matched_info?.name || "Custom Voice",
          gender: matched_info?.gender || "unknown",
          language: chosen_lang,
          sample_rate: s_rate,
          char_count: content.length,
          audio_format: "wav",
          audio_base64: audio_b64,
          data_uri: `data:audio/wav;base64,${audio_b64}`
        }
      };
    } catch (err) {
      console.log(`[ERROR] Generate Cartesia TTS: ${err?.message || err}`);
      return {
        status: false,
        result: {
          message: err?.message || "Gagal memproses speech synthesis Cartesia"
        }
      };
    }
  }
}

export default async function handler(req, res) {
  try {
    const {
      action,
      ...params
    } = req.method === "GET" ? req.query : req.body;
    const validActions = ["create", "voice_list", "voices"];

    if (!action) {
      return res.status(400).json({
        status: false,
        error: "Parameter 'action' wajib diisi.",
        available_actions: validActions,
        usage: {
          method: "GET / POST",
          examples: [
            "/?action=create&text=Halo+dunia&lang=id",
            "/?action=create&text=Hello+world&voice=Tessa&lang=en",
            "/?action=voice_list&lang=id"
          ]
        }
      });
    }

    if (!validActions.includes(action)) {
      return res.status(400).json({
        status: false,
        error: `Action tidak valid: "${action}".`,
        valid_actions: validActions
      });
    }

    const api = new CartesiaTTS();
    let response;

    switch (action) {
      case "create": {
        const text_input = params.text || params.prompt || "";
        if (!text_input || !String(text_input).trim()) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'text' wajib diisi untuk action 'create'."
          });
        }
        response = await api.create({
          text: text_input,
          voice: params.voice,
          lang: params.lang || "id",
          model: params.model || "sonic-3.6",
          sample_rate: params.sample_rate || 44100,
          ...params
        });
        break;
      }
      case "voice_list":
      case "voices": {
        response = await api.voice_list({
          lang: params.lang,
          ...params
        });
        break;
      }
    }

    if (response && response.status) {
      return res.status(200).json({
        status: true,
        action: action,
        result: response.result
      });
    } else {
      return res.status(400).json({
        status: false,
        action: action,
        error: response?.result?.message || "Gagal memproses request ke Cartesia TTS."
      });
    }
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada handler Cartesia:`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server.",
      error: error?.message || "Unknown Error"
    });
  }
}