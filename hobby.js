
(() => {
  "use strict";

  const config = window.__MY_APP_CONFIG__ || {};
  const remoteClient = config.SUPABASE_URL && config.SUPABASE_ANON_KEY && window.supabase?.createClient
    ? window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: window.localStorage },
    })
    : null;

  const TABLES = {
    projects: "script_projects",
    chapters: "script_chapters",
    lines: "script_dialogue_lines",
    speakers: "script_speakers",
    concepts: "project_concepts",
    identity: "identity_concept_items",
  };
  const LOCAL_KEYS = {
    projects: "my-application.hobby.projects.v0.1",
    chapters: "my-application.hobby.chapters.v0.1",
    lines: "my-application.hobby.lines.v0.1",
    speakers: "my-application.hobby.speakers.v0.1",
    concepts: "my-application.hobby.concepts.v0.1",
    identity: "my-application.hobby.identity.v0.1",
    selectedProject: "my-application.hobby.selected-project.v0.1",
  };
  const IDENTITY_PROJECT_ID = "7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61";
  const LEGACY_SEED = {"projects":[{"id":"1808eed2-970b-4396-8df3-110bb290ac89","name":"編成解説：黒獣","conceptType":"generic","outputTemplate":"{speaker}「{body}」","charsPerMinute":300,"createdAt":"2026-08-26T16:03:11.475Z","updatedAt":"2026-08-26T16:38:23.723Z"},{"id":"aa60d956-0838-4e52-a32a-010d5a6f2604","name":"夜明事務所の評価","conceptType":"generic","outputTemplate":"{speaker}「{body}」","charsPerMinute":300,"createdAt":"2026-08-26T10:36:01.867Z","updatedAt":"2026-09-02T09:27:30.268Z"},{"id":"d6255b8c-b671-4cf5-8621-4967e7e2c297","name":"編成解説：人差し指","conceptType":"generic","outputTemplate":"{speaker}「{body}」","charsPerMinute":300,"createdAt":"2026-09-04T06:29:26.566Z","updatedAt":"2026-09-04T08:11:15.787Z"},{"id":"ea4bad2c-23c0-441d-96bf-032dbcfb02ff","name":"Re.S6人格交換オススメ度","conceptType":"generic","outputTemplate":"{speaker}「{body}」","charsPerMinute":300,"createdAt":"2026-08-26T16:38:31.611Z","updatedAt":"2026-08-26T16:38:57.455Z"}],"chapters":[{"id":"3b991676-2df4-473b-a4ec-7bb221d2fda0","projectId":"ea4bad2c-23c0-441d-96bf-032dbcfb02ff","position":1,"name":"チャプター1","createdAt":"2026-08-26T16:38:31.752Z","updatedAt":"2026-08-26T16:38:31.752Z"},{"id":"4f999f2f-ab79-411a-a9f9-083f5b2b79af","projectId":"aa60d956-0838-4e52-a32a-010d5a6f2604","position":5,"name":"エンディング","createdAt":"2026-08-30T19:26:12.642Z","updatedAt":"2026-09-01T06:28:29.883Z"},{"id":"56c6f242-3812-489c-bf5b-9c6920002544","projectId":"1808eed2-970b-4396-8df3-110bb290ac89","position":1,"name":"チャプター1","createdAt":"2026-08-26T16:03:11.642Z","updatedAt":"2026-08-26T16:03:11.642Z"},{"id":"5e5b6f84-ec2a-4e6a-8b34-9ed7f95009b0","projectId":"d6255b8c-b671-4cf5-8621-4967e7e2c297","position":5,"name":"編成その3：E.G.Oぶっぱ型","createdAt":"2026-09-04T06:32:03.683Z","updatedAt":"2026-09-04T06:32:39.113Z"},{"id":"623116ac-1dfb-4354-a39c-1b4f4cfb953c","projectId":"d6255b8c-b671-4cf5-8621-4967e7e2c297","position":3,"name":"編成その1：GS型","createdAt":"2026-09-04T06:31:29.554Z","updatedAt":"2026-09-04T06:32:30.583Z"},{"id":"814500a4-43c4-438a-9805-944607cee764","projectId":"aa60d956-0838-4e52-a32a-010d5a6f2604","position":2,"name":"評価基準の見直し","createdAt":"2026-08-30T19:20:42.519Z","updatedAt":"2026-09-01T06:28:29.883Z"},{"id":"83880fef-7f21-461b-8b13-65d1340612bc","projectId":"d6255b8c-b671-4cf5-8621-4967e7e2c297","position":2,"name":"人差し指編成の基礎","createdAt":"2026-09-04T06:31:27.272Z","updatedAt":"2026-09-04T06:32:30.583Z"},{"id":"94eefba2-5cdf-45f1-8782-027384e38869","projectId":"aa60d956-0838-4e52-a32a-010d5a6f2604","position":3,"name":"夜明事務所の評価","createdAt":"2026-08-30T19:20:46.333Z","updatedAt":"2026-09-01T06:28:29.883Z"},{"id":"a4e75e0a-6b2d-4667-a473-d1476297494f","projectId":"d6255b8c-b671-4cf5-8621-4967e7e2c297","position":4,"name":"編成その2：剣契呼吸型","createdAt":"2026-09-04T06:31:52.007Z","updatedAt":"2026-09-04T06:32:30.583Z"},{"id":"b51ca3d0-c933-46d2-90c8-ef92ec2c9ff9","projectId":"d6255b8c-b671-4cf5-8621-4967e7e2c297","position":6,"name":"鏡ダンジョン向け編成","createdAt":"2026-09-04T06:32:47.173Z","updatedAt":"2026-09-04T06:32:51.561Z"},{"id":"c03592d0-9481-41c5-9459-3f21d1e303f9","projectId":"d6255b8c-b671-4cf5-8621-4967e7e2c297","position":7,"name":"まとめ","createdAt":"2026-09-04T06:32:57.159Z","updatedAt":"2026-09-04T06:33:02.544Z"},{"id":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","projectId":"aa60d956-0838-4e52-a32a-010d5a6f2604","position":1,"name":"冒頭","createdAt":"2026-08-27T15:22:24.740Z","updatedAt":"2026-09-01T06:28:29.883Z"},{"id":"e4587b19-39c1-4d04-980b-f33780d954ab","projectId":"aa60d956-0838-4e52-a32a-010d5a6f2604","position":4,"name":"シーズン８人格のインフレ予想","createdAt":"2026-08-30T19:21:05.880Z","updatedAt":"2026-09-01T06:28:29.883Z"},{"id":"f7a47152-0e33-4415-9e31-0ebc4d774144","projectId":"d6255b8c-b671-4cf5-8621-4967e7e2c297","position":1,"name":"冒頭","createdAt":"2026-09-04T06:29:26.871Z","updatedAt":"2026-09-04T06:32:30.583Z"}],"lines":[{"id":"00abd0e1-d57d-4472-987a-d264d89314d3","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":48,"speaker":"こいし　解説","body":"そのため、ダメージを出せずに燻る場面も少ないです。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"0261a72f-816c-4cb6-99c2-d620762f5c3f","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":50,"speaker":"こいし　解説","body":"鏡では、グレゴールも火傷・振動編成へ入ります。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"04253d58-550c-4621-98f5-f3b6387cd039","chapterId":"814500a4-43c4-438a-9805-944607cee764","position":10,"speaker":"こいし　解説","body":"汎用性が高くても他の評価が低ければ、いわゆる器用貧乏。","createdAt":"2026-09-01T06:29:53.405Z","updatedAt":"2026-09-01T09:27:14.392Z"},{"id":"094eb855-03d4-49ee-8395-80974b25a554","chapterId":"e4587b19-39c1-4d04-980b-f33780d954ab","position":4,"speaker":"こいし　解説","body":"これが今後の基準になるのではないか、という見方もあります。","createdAt":"2026-09-01T06:30:35.754Z","updatedAt":"2026-09-02T09:27:29.997Z"},{"id":"0d285fca-b904-4c27-8612-137e107c5d0e","chapterId":"e4587b19-39c1-4d04-980b-f33780d954ab","position":9,"speaker":"こいし　解説","body":"また直近では、E.G.O込みの剣契頭目やLCDイシュ、末兄ヒースなども相当強い。","createdAt":"2026-09-01T06:30:35.754Z","updatedAt":"2026-09-02T09:27:29.997Z"},{"id":"0d79314f-a91b-4391-8d84-ed9444cb30e7","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":14,"speaker":"こいし　解説","body":"S1しか手元にいないときに、特殊S3を切るのは避けたいですね。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"0fb11575-e8e3-4f27-a3aa-4b013c40c197","chapterId":"4f999f2f-ab79-411a-a9f9-083f5b2b79af","position":3,"speaker":"こいし　解説","body":"図書館では役回り上、やられ役になってしまうゲストを、プレイアブルとして強く使える。","createdAt":"2026-09-01T06:31:33.316Z","updatedAt":"2026-09-01T06:31:33.316Z"},{"id":"11a3feb4-ef4f-41d3-a715-e1cb58cd0fde","chapterId":"e4587b19-39c1-4d04-980b-f33780d954ab","position":14,"speaker":"こいし　解説","body":"少なくとも性能の下限は、かなり上がりそうです。","createdAt":"2026-09-01T06:30:35.754Z","updatedAt":"2026-09-02T09:27:29.997Z"},{"id":"11b0fc0c-c48e-494c-bc50-75b869925257","chapterId":"83880fef-7f21-461b-8b13-65d1340612bc","position":8,"speaker":"こいし　解説","body":"ちなみにドンキとイサンのような上級組織員は、ペナルティを得る代わりにステージスキップができます。","createdAt":"2026-09-04T07:58:55.066Z","updatedAt":"2026-09-04T08:10:57.741Z"},{"id":"11da83b4-833c-451a-afcd-6ee8c9fc69d1","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":22,"speaker":"こいし　解説","body":"単コインはマッチ不安なのも惜しくて、鏡攻略は4点止まりです。","createdAt":"2026-09-01T06:28:46.729Z","updatedAt":"2026-09-01T09:18:51.482Z"},{"id":"12e094c0-d5de-434b-810a-bcc121133035","chapterId":"814500a4-43c4-438a-9805-944607cee764","position":8,"speaker":"こいし　解説","body":"汎用性が高い人格ほど、さまざまな編成へ出張しやすく、活躍の幅も広がります。","createdAt":"2026-09-01T06:29:53.405Z","updatedAt":"2026-09-01T09:27:14.392Z"},{"id":"130f9883-5fe9-4ae5-9687-c33a7ee8dce8","chapterId":"814500a4-43c4-438a-9805-944607cee764","position":3,"speaker":"こいし　解説","body":"多くの回答、ありがとうございます。","createdAt":"2026-09-01T06:29:53.405Z","updatedAt":"2026-09-01T09:27:14.392Z"},{"id":"14e8db31-88ee-4b28-9bec-5e5ebf727bf8","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":8,"speaker":"こいし　解説","body":"S3なら、コイン再使用も含めて総威力200近く。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"1543840d-2469-44ff-b9d3-af40da0c0a45","chapterId":"e4587b19-39c1-4d04-980b-f33780d954ab","position":15,"speaker":"こいし　解説","body":"マッチ力でいうなら、基本12-17-18あたりが標準化してくるかもしれませんね。","createdAt":"2026-09-01T06:30:35.754Z","updatedAt":"2026-09-02T09:27:29.997Z"},{"id":"167a0545-30a7-47e7-9117-2750a2aa9d75","chapterId":"e4587b19-39c1-4d04-980b-f33780d954ab","position":5,"speaker":"こいし　解説","body":"ただし私は、親方は特殊枠として扱うべきと考えています。","createdAt":"2026-09-01T06:30:35.754Z","updatedAt":"2026-09-02T09:27:29.997Z"},{"id":"175758d7-a621-4157-897d-a63a0c6bf211","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":45,"speaker":"こいし　解説","body":"攻略評価は5点です。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"18421161-0848-4dde-b30f-fe59d52df1da","chapterId":"814500a4-43c4-438a-9805-944607cee764","position":18,"speaker":"こいし　解説","body":"ただ、この二つは今作っている評価軸とは別の観点になりそうです。\n","createdAt":"2026-09-01T06:29:53.405Z","updatedAt":"2026-09-01T09:27:14.392Z"},{"id":"1b752637-fa7f-4c9a-9e2c-887efabe7195","chapterId":"4f999f2f-ab79-411a-a9f9-083f5b2b79af","position":5,"speaker":"こいし　解説","body":"リンバスから図書館をやる人は、複雑な気持ちになってそう。なってそうじゃない？","createdAt":"2026-09-01T06:31:33.316Z","updatedAt":"2026-09-01T06:31:33.316Z"},{"id":"1c383e3d-269d-4171-a398-fdafa3a46170","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":9,"speaker":"こいし　解説","body":"そこへ、夜明事務所ユナのファウストと、夜明事務所代表のグレゴールが実装。","createdAt":"2026-09-01T06:28:46.729Z","updatedAt":"2026-09-01T09:18:51.482Z"},{"id":"2180f80f-7fa3-476d-bdbc-c728e619a7bb","chapterId":"4f999f2f-ab79-411a-a9f9-083f5b2b79af","position":9,"speaker":"こいし　解説","body":"皆さんの予想をお聞かせください。","createdAt":"2026-09-01T06:31:33.316Z","updatedAt":"2026-09-01T06:31:33.316Z"},{"id":"2298858f-6ada-46ab-ad5f-acbbdcafd616","chapterId":"e4587b19-39c1-4d04-980b-f33780d954ab","position":2,"speaker":"こいし　解説","body":"まず、リンバスはソーシャルゲームである以上、インフレは進むという前提で見ています。","createdAt":"2026-09-01T06:30:35.754Z","updatedAt":"2026-09-02T09:27:29.997Z"},{"id":"236ee4df-c5f9-4fa5-adf9-5431b2449f6b","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":57,"speaker":"こいし　解説","body":"そのため4点といったところでしょう。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"2479b3b5-4369-4d94-b715-7ad1fb206190","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":2,"speaker":"こいし　解説","body":"評価、合計１６点。","createdAt":"2026-09-01T09:07:51.354Z","updatedAt":"2026-09-01T09:18:51.482Z"},{"id":"2917141c-a6d3-41cc-a029-5218aea7c230","chapterId":"83880fef-7f21-461b-8b13-65d1340612bc","position":1,"speaker":"こいし　解説","body":"まずは、どの型にも共通する人差し指編成の仕組みから見ていきます。","createdAt":"2026-09-04T07:17:50.119Z","updatedAt":"2026-09-04T08:10:57.741Z"},{"id":"2959223a-0e6b-4ccb-9343-d4c452634309","chapterId":"f7a47152-0e33-4415-9e31-0ebc4d774144","position":6,"speaker":"こいし","body":"指令に従い、対象を倒せ。","createdAt":"2026-09-04T07:22:55.465Z","updatedAt":"2026-09-04T07:29:24.179Z"},{"id":"2a3ee65b-6206-42d0-b386-98acb106737d","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":53,"speaker":"こいし　解説","body":"支援、火力、耐久の三拍子が揃っていて非常に偉い。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"2bdc917e-bed8-4618-bf20-4f71966c2d2f","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":8,"speaker":"こいし　解説","body":"また低い体力に混乱区間が三つと、低耐久すぎるのが欠点でした。","createdAt":"2026-09-01T09:05:24.723Z","updatedAt":"2026-09-01T09:18:51.482Z"},{"id":"2c5928dc-c1f5-4723-b117-4939415025af","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":20,"speaker":"こいし　解説","body":"さて鏡では火傷・振動人格に該当します。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"3250e967-3242-4fa2-a47b-86698ebf285d","chapterId":"814500a4-43c4-438a-9805-944607cee764","position":20,"speaker":"こいし　解説","body":"唯一無二性は編成解説動画で補いつつ、また交換おすすめ度に関する動画も別途作れたらと思います。","createdAt":"2026-09-01T06:29:53.405Z","updatedAt":"2026-09-01T09:27:47.454Z"},{"id":"326b1efc-6316-4e7d-b8d5-24e87c44fb89","chapterId":"814500a4-43c4-438a-9805-944607cee764","position":6,"speaker":"こいし　解説","body":"そこで今回からは、ここを『編成汎用性』へ変更します。","createdAt":"2026-09-01T06:29:53.405Z","updatedAt":"2026-09-01T09:27:14.392Z"},{"id":"34654e08-7c2b-4ef5-b351-e5c8b2a2224b","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":4,"speaker":"こいし　解説","body":"夜明事務所ユナの人格を被ったファウストです。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"357c5a81-91f2-4f90-8385-2aeb5a5be52f","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":23,"speaker":"こいし　解説","body":"強化S3で威力減少を付与してもいいですし、いざとなれば特殊S3で回復を挟んでもいい。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"37235a13-e40d-4f87-8a66-f5340ba8c785","chapterId":"f7a47152-0e33-4415-9e31-0ebc4d774144","position":4,"speaker":"こいし","body":"その様相に、人差し指は指の中で最も狂っていると言われることも多い。","createdAt":"2026-09-04T07:28:23.171Z","updatedAt":"2026-09-04T07:29:24.179Z"},{"id":"374f902f-42f2-4e0f-9e15-b29dec071865","chapterId":"e4587b19-39c1-4d04-980b-f33780d954ab","position":3,"speaker":"こいし　解説","body":"シーズン7では親方級が登場しました。","createdAt":"2026-09-01T06:30:35.754Z","updatedAt":"2026-09-02T09:27:29.997Z"},{"id":"3950ed3b-1a21-4209-918f-e3b351e4284c","chapterId":"e4587b19-39c1-4d04-980b-f33780d954ab","position":8,"speaker":"こいし　解説","body":"夜明事務所は親方未満ではあるものの、かなり高性能です。","createdAt":"2026-09-01T06:30:35.754Z","updatedAt":"2026-09-02T09:27:29.997Z"},{"id":"39a5ef84-a2e6-4033-8a09-9064c2085f2a","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":29,"speaker":"こいし　解説","body":"そのため編成汎用性は５点評価です。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"3a4cbb6e-9270-4e5f-a8f1-5636d2612508","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":26,"speaker":"こいし　解説","body":"何かしらの強化を貰ってほしいとは言っていましたが、こういう形で強くなるとは脱帽ですね。","createdAt":"2026-09-01T06:28:46.729Z","updatedAt":"2026-09-01T09:18:51.482Z"},{"id":"3b74f9c2-d979-4cd6-b5e1-43494e977740","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":13,"speaker":"こいし　解説","body":"ということで、攻略評価は最上位の5点まで伸びました。","createdAt":"2026-09-01T09:12:33.004Z","updatedAt":"2026-09-01T09:18:51.482Z"},{"id":"3c86f1b5-e82e-4d7c-824c-099475c2a9ed","chapterId":"f7a47152-0e33-4415-9e31-0ebc4d774144","position":5,"speaker":"こいし","body":"でもそれで実際に強くなれるんだから、彼らは閉口するしかない。","createdAt":"2026-09-04T07:24:23.269Z","updatedAt":"2026-09-04T07:29:24.179Z"},{"id":"3c8925c4-5953-4fc1-8e3c-1309e950143d","chapterId":"83880fef-7f21-461b-8b13-65d1340612bc","position":9,"speaker":"こいし　解説","body":"そして更にステージクリアごとにボーナスが”解禁”されるオマケつき。","createdAt":"2026-09-04T08:01:24.580Z","updatedAt":"2026-09-04T08:10:57.741Z"},{"id":"405eca04-e088-4cb7-a7c2-bbd689ef09d4","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":29,"speaker":"こいし　解説","body":"前回のシーズン7動画から一箇所だけ変えているので、先にそこを説明します。","createdAt":"2026-09-01T06:28:46.729Z","updatedAt":"2026-09-01T09:18:51.482Z"},{"id":"40e8691e-dd51-4566-b266-c249cd6c9cef","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":15,"speaker":"こいし　解説","body":"３枠に多量の火傷回数を撒き、火力も十分。","createdAt":"2026-09-01T06:28:46.729Z","updatedAt":"2026-09-01T09:18:51.482Z"},{"id":"42beba01-10f2-4562-92a0-016fcd9b3c6a","chapterId":"814500a4-43c4-438a-9805-944607cee764","position":19,"speaker":"こいし　解説","body":"交換オススメ度は特に、各々の手持ちによって前後してきますからね。","createdAt":"2026-09-01T09:27:14.011Z","updatedAt":"2026-09-01T09:27:47.314Z"},{"id":"4485f75d-6150-44d7-b8b9-364a28e48c13","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":31,"speaker":"こいし　解説","body":"シーズン8では、親方級が当たり前になるほどインフレするのか。","createdAt":"2026-09-01T06:28:46.729Z","updatedAt":"2026-09-01T09:18:51.482Z"},{"id":"448fbffc-4848-4b09-8bd1-2e962eefb279","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":26,"speaker":"こいし　解説","body":"さて、バフ周りは自己完結しており、強化条件である火傷もかなり簡単に維持できます。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"4501dd0d-401f-4fc0-bcb5-b2ad58140f57","chapterId":"83880fef-7f21-461b-8b13-65d1340612bc","position":10,"speaker":"こいし　解説","body":"これがそれぞれの人格の個性にも関わってくる要素なのですが、","createdAt":"2026-09-04T08:04:23.141Z","updatedAt":"2026-09-04T08:10:57.741Z"},{"id":"4620e438-b6ab-4c6b-afe0-931cbdfc5b15","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":56,"speaker":"こいし　解説","body":"ただし支援性能を引き出すなら、親指や夜明事務所と組みたい。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-02T09:17:29.657Z"},{"id":"4703bea5-2455-4077-a581-d35760e781c8","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":5,"speaker":"こいし　解説","body":"ソロ戦法由来の高い自己完結性を残しつつ、夜明事務所との横シナジーもしっかり持っています。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"4b6e454c-b21c-4f8c-b213-82fbd60134f2","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":3,"speaker":"こいし　解説","body":"ソロ戦法の代名詞、『孤独なフィクサー』の使い手が一人。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"4be79172-5244-419c-9015-4a86584bdd66","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":18,"speaker":"こいし　解説","body":"鏡では従来、精神力制限のせいで、そもそもE.G.O開花ができませんでした。","createdAt":"2026-09-01T06:28:46.729Z","updatedAt":"2026-09-01T09:18:51.482Z"},{"id":"4f002fcf-3c03-4071-8854-343b43e6ccf4","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":51,"speaker":"こいし　解説","body":"S3で味方にバフを撒き続けられるため、優れた支援性能を誇ります。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"509f30fa-0f71-4421-b86c-2419df0b0484","chapterId":"e4587b19-39c1-4d04-980b-f33780d954ab","position":6,"speaker":"こいし　解説","body":"実際、落ちぶれたとはいえ指の上位幹部ですからね。あんなのが何人も出てきたらたまりません。","createdAt":"2026-09-02T09:20:01.417Z","updatedAt":"2026-09-02T09:27:29.997Z"},{"id":"511c7053-b6e2-43dd-86d3-b925b5f50939","chapterId":"f7a47152-0e33-4415-9e31-0ebc4d774144","position":2,"speaker":"こいし","body":"裏路地の五大組織こと指の一角であり、指令を重んじる組織。","createdAt":"2026-09-04T07:19:53.988Z","updatedAt":"2026-09-04T07:29:24.179Z"},{"id":"570cb128-2866-405b-b3e5-f3f94eb21d1b","chapterId":"e4587b19-39c1-4d04-980b-f33780d954ab","position":11,"speaker":"こいし　解説","body":"全体的に弱点らしい弱点がなく、隙を晒しにくい性能なんですね。","createdAt":"2026-09-02T09:27:29.577Z","updatedAt":"2026-09-02T09:27:29.997Z"},{"id":"58c4ee98-7207-4bd6-b371-54307943fb20","chapterId":"f7a47152-0e33-4415-9e31-0ebc4d774144","position":1,"speaker":"こいし","body":"人差し指。","createdAt":"2026-09-04T07:17:29.119Z","updatedAt":"2026-09-04T07:29:24.179Z"},{"id":"58e1043e-3768-4473-93e5-8ccca945fba0","chapterId":"814500a4-43c4-438a-9805-944607cee764","position":9,"speaker":"こいし　解説","body":"個人的に、いろんな編成で働ける器用さも、評点へ含めたいと考えているからです。","createdAt":"2026-09-01T06:29:53.405Z","updatedAt":"2026-09-01T09:27:14.392Z"},{"id":"59dc566f-55f7-488b-8e2a-f7f39d9d3f32","chapterId":"4f999f2f-ab79-411a-a9f9-083f5b2b79af","position":8,"speaker":"こいし　解説","body":"また、シーズン8の性能インフレや、どのようなキーワード・ギミックが主体になりそうかという意見も募集中です。","createdAt":"2026-09-01T06:31:33.316Z","updatedAt":"2026-09-01T06:31:33.316Z"},{"id":"5a2dca9a-03f5-48ac-a4bb-dc2a1ea73ac0","chapterId":"f7a47152-0e33-4415-9e31-0ebc4d774144","position":8,"speaker":"こいし","body":"編成解説！人差し指のつかいかたについて","createdAt":"2026-09-04T07:29:23.294Z","updatedAt":"2026-09-04T07:29:29.608Z"},{"id":"5b909c64-ffe8-4547-8120-65076d473ff1","chapterId":"e4587b19-39c1-4d04-980b-f33780d954ab","position":16,"speaker":"こいし　解説","body":"もちろん、ハイライト人格のような一部の強者だけに、親方級の性能が与えられる可能性はあります。","createdAt":"2026-09-01T06:30:35.754Z","updatedAt":"2026-09-02T09:27:29.997Z"},{"id":"5bca19b4-b43d-40f4-b223-5040b2e0e9bd","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":19,"speaker":"こいし　解説","body":"ということで、周回評価も5点。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"5bff3c03-4c8c-41f1-bf9d-d82c4213500b","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":58,"speaker":"こいし　解説","body":"まとめると、編成にいる全員が確実に強くなる、大将のような存在です。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-02T09:18:31.185Z"},{"id":"5caa9ec4-3d78-4c09-a49b-7cd35805bc6e","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":25,"speaker":"こいし　解説","body":"親指と合わせて、火傷・振動編成で暴れましょう。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"5e161a94-93db-4bf9-b4d2-5c7233fc6544","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":54,"speaker":"こいし　解説","body":"鏡攻略は堂々の5点です。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"612e088e-139c-49ef-a643-d09357d2fc82","chapterId":"83880fef-7f21-461b-8b13-65d1340612bc","position":4,"speaker":"こいし　解説","body":"ざっくり言うと、選ばれたスキルで選ばれた対象を殴ればステージクリアです。","createdAt":"2026-09-04T07:56:57.506Z","updatedAt":"2026-09-04T08:10:57.741Z"},{"id":"6274840d-bd9c-42f3-82c6-0576d657e3aa","chapterId":"e4587b19-39c1-4d04-980b-f33780d954ab","position":7,"speaker":"こいし　解説","body":"そこで、親方以外の最近の人格を見ていきます。","createdAt":"2026-09-01T06:30:35.754Z","updatedAt":"2026-09-02T09:27:29.997Z"},{"id":"64e58a78-00f4-49a4-80f4-a7754d122ace","chapterId":"a4e75e0a-6b2d-4667-a473-d1476297494f","position":1,"speaker":"こいし","body":"あ","createdAt":"2026-09-04T07:18:28.727Z","updatedAt":"2026-09-04T07:18:28.727Z"},{"id":"662d9a7c-1434-470c-88f9-45163231fd34","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":30,"speaker":"こいし　解説","body":"またその後に、シーズン8の人格がどの程度強くなるのかについても予想します。","createdAt":"2026-09-01T06:28:46.729Z","updatedAt":"2026-09-01T09:20:24.906Z"},{"id":"6855040d-de1f-4e07-8324-95a62b9fb097","chapterId":"83880fef-7f21-461b-8b13-65d1340612bc","position":7,"speaker":"こいし　解説","body":"”カルマ”によってどんどん耐久が脆くなるので、早めに３ステクリアしたいところです。","createdAt":"2026-09-04T07:58:23.170Z","updatedAt":"2026-09-04T08:10:57.741Z"},{"id":"6bb1d9d1-8ff0-4f4f-b26e-c25a4fa13e02","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":16,"speaker":"こいし　解説","body":"以降は３ターンに一度、特殊S3を狙えるようになりますね。これが強い。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"6dd426f0-271f-4112-b85f-892fdaad7739","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":5,"speaker":"こいし　解説","body":"夜明事務所人格の実装により、フィリシンが墓から蘇る！","createdAt":"2026-09-01T09:07:06.282Z","updatedAt":"2026-09-01T09:18:51.482Z"},{"id":"6e26efa0-87aa-43ce-97cb-0b50bc4e2df7","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":46,"speaker":"こいし　解説","body":"一方で性能は全体的にサポート寄りで、火力は強化S3で出していくことになります。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"6e488516-3774-468f-b248-339c2df01ffb","chapterId":"623116ac-1dfb-4354-a39c-1b4f4cfb953c","position":1,"speaker":"こいし　解説","body":"あ","createdAt":"2026-09-04T07:18:12.297Z","updatedAt":"2026-09-04T07:18:19.348Z"},{"id":"6fc5af1a-f522-4b3f-8d36-42714cf0c316","chapterId":"814500a4-43c4-438a-9805-944607cee764","position":17,"speaker":"こいし　解説","body":"また、コメントでは特定編成での唯一無二性や、交換おすすめ度を知りたいという意見もありました。","createdAt":"2026-09-01T06:29:53.405Z","updatedAt":"2026-09-01T09:27:14.392Z"},{"id":"71cf2aea-da1f-4d72-a2e4-969dfea526bd","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":31,"speaker":"こいし　解説","body":"次回のヴァルプルギスの夜が開催されたときには、優先して交換したい人格の一人です。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"71e145e9-de33-4a79-b8da-1c07e3c26cdf","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":42,"speaker":"こいし　解説","body":"しかも強化S3で味方に撒けるバフがかなり強く、火傷編成での恩恵は凄まじい。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-02T09:15:01.290Z"},{"id":"7481d9c5-5540-4996-b803-f39c4d235912","chapterId":"e4587b19-39c1-4d04-980b-f33780d954ab","position":12,"speaker":"こいし　解説","body":"これは最高値を更新する流れというより、高性能帯の層が厚くなっている流れに見えます。","createdAt":"2026-09-01T06:30:35.754Z","updatedAt":"2026-09-02T09:27:29.997Z"},{"id":"7597fa59-0e7a-489e-8210-81357343809d","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":36,"speaker":"こいし　解説","body":"数十年のフィクサー歴による老練な戦術で、万能に立ち回ります。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"76edba08-fd72-4824-a71c-5d6af4d28325","chapterId":"814500a4-43c4-438a-9805-944607cee764","position":2,"speaker":"こいし　解説","body":"前回のシーズン7動画で使った四つの評価軸について、アンケートを取りました。","createdAt":"2026-09-01T06:29:53.405Z","updatedAt":"2026-09-01T09:27:14.392Z"},{"id":"78e4f32d-58f9-46a1-979b-da57fef8f471","chapterId":"f7a47152-0e33-4415-9e31-0ebc4d774144","position":7,"speaker":"こいし","body":"今回は、そんな人差し指編成の動かし方を解説していきます。","createdAt":"2026-09-04T07:20:23.252Z","updatedAt":"2026-09-04T07:29:24.179Z"},{"id":"7aa4b583-4fea-4979-9eb3-96b4ed8889d9","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":27,"speaker":"こいし　解説","body":"ということで今回は、夜明事務所の人格三名について評価していきます。","createdAt":"2026-09-01T06:28:46.729Z","updatedAt":"2026-09-01T09:18:51.482Z"},{"id":"7b67456e-1cff-4146-bccf-14775b1ad381","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":3,"speaker":"こいし　解説","body":"僕のために悲しんで泣いてくれる人はもういない","createdAt":"2026-09-01T09:06:08.663Z","updatedAt":"2026-09-01T09:18:51.482Z"},{"id":"7c84999f-825d-47c8-914c-d3d51e9a90f7","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":19,"speaker":"こいし　解説","body":"しかし新ギフトの実装により、遂に鏡深層でもE.G.Oが開花。","createdAt":"2026-09-01T06:28:46.729Z","updatedAt":"2026-09-01T09:18:51.482Z"},{"id":"7d36f494-414a-49fe-bb13-b6925c61a0d4","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":24,"speaker":"こいし　解説","body":"鏡攻略も5点です。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"7f997a3c-5c36-485a-8c01-342ce1826612","chapterId":"814500a4-43c4-438a-9805-944607cee764","position":4,"speaker":"こいし　解説","body":"結果としては、評価軸そのものは変えなくていいという意見がほとんどでした。","createdAt":"2026-09-01T06:29:53.405Z","updatedAt":"2026-09-01T09:27:14.392Z"},{"id":"7fc66382-7572-42cf-a0b6-3542129a6a9c","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":1,"speaker":"こいし　解説","body":"夜明事務所、フィクサー、シンクレア。","createdAt":"2026-09-01T06:28:46.729Z","updatedAt":"2026-09-01T09:18:51.482Z"},{"id":"81c8698f-c721-4f62-b7df-a41f9ee6e9b1","chapterId":"4f999f2f-ab79-411a-a9f9-083f5b2b79af","position":10,"speaker":"こいし　解説","body":"ということで今回は、このあたりで。","createdAt":"2026-09-01T06:31:33.316Z","updatedAt":"2026-09-01T06:31:33.316Z"},{"id":"82041257-19ae-4707-be04-1261494eb4a2","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":15,"speaker":"こいし　解説","body":"さて一度特殊S3を切れれば、戦闘感覚により棺の溜まりも早くなります。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"82748f9c-d423-4ed5-828d-dd580d32d317","chapterId":"814500a4-43c4-438a-9805-944607cee764","position":11,"speaker":"こいし　解説","body":"汎用性も他の評価も高ければ、万能型です。","createdAt":"2026-09-01T06:29:53.405Z","updatedAt":"2026-09-01T09:27:14.392Z"},{"id":"85ba9cc1-2192-48dc-809a-ebf58f7f1cb7","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":40,"speaker":"こいし　解説","body":"そしてユナファウと同じく、暁の火には自傷火傷があります。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-02T09:14:32.428Z"},{"id":"8812f3f3-181e-40ba-81e9-1dbf5484345c","chapterId":"4f999f2f-ab79-411a-a9f9-083f5b2b79af","position":4,"speaker":"こいし　解説","body":"そこにリンバスの魅力を改めて感じました。","createdAt":"2026-09-01T06:31:33.316Z","updatedAt":"2026-09-01T06:31:33.316Z"},{"id":"8a1ed397-e8fd-4f12-8c16-748feb66dfb8","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":7,"speaker":"こいし　解説","body":"炎蝶の棺があるときのS1やS2は火力が高く、特にS2は総威力が90近くまで伸びます。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"8b5d1133-a0ac-46c3-a396-b696e737afba","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":17,"speaker":"こいし　解説","body":"元々光るものはあるとされていた長所に安定感が加わり、周回評価も5点に到達しました。","createdAt":"2026-09-01T06:28:46.729Z","updatedAt":"2026-09-01T09:18:51.482Z"},{"id":"8b69bc7d-7896-4217-9cac-ac29aa58c166","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":30,"speaker":"こいし　解説","body":"総評すると、耐久も火力も優れた高性能火傷アタッカー。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:38:14.354Z"},{"id":"8ced4cf9-d4aa-482c-be98-743b3d092f7f","chapterId":"83880fef-7f21-461b-8b13-65d1340612bc","position":13,"speaker":"こいし　解説","body":"人差し指で編成を組む必要はある？","createdAt":"2026-09-04T08:10:57.438Z","updatedAt":"2026-09-04T08:11:15.612Z"},{"id":"8d2a34be-fb4a-47cc-9fbb-d68bdb53dce4","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":47,"speaker":"こいし　解説","body":"この強化S3は守備からも出すことができます。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-02T09:15:29.454Z"},{"id":"8ec6b98a-5364-40e3-af8b-39eb93e1805b","chapterId":"814500a4-43c4-438a-9805-944607cee764","position":21,"speaker":"こいし　解説","body":"ということで、この評価基準で夜明事務所の残り二人を見ていきましょう。","createdAt":"2026-09-01T06:29:53.405Z","updatedAt":"2026-09-01T09:27:14.392Z"},{"id":"8f17dc20-d35b-4b76-8cb7-72d9c21c939a","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":32,"speaker":"こいし　解説","body":"夜明事務所を考察したあと、そこにも触れていきましょう。","createdAt":"2026-09-01T06:28:46.729Z","updatedAt":"2026-09-01T09:18:51.482Z"},{"id":"8f7a3fa3-41a3-4e0d-83c6-e09d0af6719a","chapterId":"e4587b19-39c1-4d04-980b-f33780d954ab","position":10,"speaker":"こいし　解説","body":"共通するのは、素のステータスが高いのに混乱区間も少なく、スキル威力も十分。","createdAt":"2026-09-02T09:27:01.932Z","updatedAt":"2026-09-02T09:27:29.997Z"},{"id":"8f7e4f99-05aa-473d-b1ce-57e799c9c83b","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":33,"speaker":"こいし　解説","body":"評価、合計18点。","createdAt":"2026-09-01T09:37:46.432Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"912b82d9-4dbe-484f-bd1e-6f15b0f6dbf3","chapterId":"c03592d0-9481-41c5-9459-3f21d1e303f9","position":1,"speaker":"こいし","body":"あ","createdAt":"2026-09-04T07:19:32.055Z","updatedAt":"2026-09-04T07:19:32.055Z"},{"id":"9bbf3a6d-f427-4587-937d-7fc17ec42fe1","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":2,"speaker":"こいし　解説","body":"評価、合計20点。","createdAt":"2026-09-01T09:28:47.648Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"9c5fce62-caee-458c-8f5c-2efba5b5cdf8","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":14,"speaker":"こいし　解説","body":"さらに精神が安定したことで、S2を広域化させて使えるのも大きいです。","createdAt":"2026-09-01T06:28:46.729Z","updatedAt":"2026-09-01T09:18:51.482Z"},{"id":"9ce7766b-daa6-4aad-9ada-fc0a7e247774","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":4,"speaker":"こいし　解説","body":"――はずだった！","createdAt":"2026-09-01T09:06:57.411Z","updatedAt":"2026-09-01T09:18:51.482Z"},{"id":"9d0d6ec4-62e8-4d0f-bf57-fe8362412e9b","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":17,"speaker":"こいし　解説","body":"常時スキルの火力が高く、任意で特殊S3も出せる。便利な人格です。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"9dc8fe9e-35d8-4d59-8224-822fddf25bd5","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":23,"speaker":"こいし　解説","body":"そして大きく強化された反面、やはり夜明の二人がいないと機能が止まりやすい。","createdAt":"2026-09-01T06:28:46.729Z","updatedAt":"2026-09-01T09:18:51.482Z"},{"id":"9f050346-961b-46fa-8914-ccbbf9b1cf47","chapterId":"814500a4-43c4-438a-9805-944607cee764","position":1,"speaker":"こいし　解説","body":"まずは、評価基準の見直しです。","createdAt":"2026-09-01T06:29:53.405Z","updatedAt":"2026-09-01T09:27:14.392Z"},{"id":"9f298439-92a4-420d-a514-81bfa827abf0","chapterId":"814500a4-43c4-438a-9805-944607cee764","position":15,"speaker":"こいし　解説","body":"単体なら全力は出せないまでも、ある程度動けるなら３点。","createdAt":"2026-09-01T06:29:53.405Z","updatedAt":"2026-09-01T09:27:14.392Z"},{"id":"a015b8c5-c03e-49fa-b1af-3e2157f980b9","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":25,"speaker":"こいし　解説","body":"総評し、夜明事務所によって遂に咲き誇った、現環境の前線を走るアタッカーです。","createdAt":"2026-09-01T06:28:46.729Z","updatedAt":"2026-09-01T09:18:51.482Z"},{"id":"a0639c47-bfc1-40bb-8715-bc6948bdf79e","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":6,"speaker":"こいし　解説","body":"シンクレアは元々、火傷の付与量がかなり優秀な人格でした。","createdAt":"2026-09-01T06:28:46.729Z","updatedAt":"2026-09-01T09:18:51.482Z"},{"id":"a430c93e-7cbc-4631-86aa-212d5acf1f80","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":37,"speaker":"こいし　解説","body":"彼は優れたステータスと高いマッチ力で、堅実に戦うスタイルです。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-02T09:13:08.030Z"},{"id":"ad969dcb-790c-4ad1-aed6-252fe402b7d4","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":44,"speaker":"こいし　解説","body":"全体的に堅実に戦う性能で、攻略では頼りになる。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"b1e6bdeb-bd2a-48d8-9a92-387c2080ef6f","chapterId":"814500a4-43c4-438a-9805-944607cee764","position":16,"speaker":"こいし　解説","body":"構築への依存が強ければ2点以下といった感じです。","createdAt":"2026-09-01T06:29:53.405Z","updatedAt":"2026-09-01T09:27:14.392Z"},{"id":"b5a81f39-bcb9-4bcf-9915-1f0cd20b5991","chapterId":"4f999f2f-ab79-411a-a9f9-083f5b2b79af","position":2,"speaker":"こいし　解説","body":"三人についてまとめると、こんな感じです。","createdAt":"2026-09-01T06:31:33.316Z","updatedAt":"2026-09-01T06:31:33.316Z"},{"id":"b6a5d024-161d-46ac-8896-afd09e68f194","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":52,"speaker":"こいし　解説","body":"そして強化S3は広域で、攻撃後の回復もある。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-02T09:16:32.853Z"},{"id":"b6b0af39-944d-4e4b-ac36-6ace02bcca7f","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":27,"speaker":"こいし　解説","body":"夜明事務所とのシナジーも、ファウストからシンクレアへ向かう側面が大きいです。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"b75eeffc-c7d9-470c-ade9-9245db94da8d","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":49,"speaker":"こいし　解説","body":"周回評価は4点あると判断しました。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"ba028d33-fe3d-423d-b3b8-9e9930917188","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":1,"speaker":"こいし　解説","body":"夜明事務所、フィクサー、ファウスト。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"bab5593f-9384-4298-9ffb-8148ccdc94c6","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":13,"speaker":"こいし　解説","body":"注意点として、炎蝶の棺がないときのS1は隙になりやすい。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"bc83e35c-6656-411b-8f0a-6d55d78b5954","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":7,"speaker":"こいし　解説","body":"ただしE.G.O発動時に精神力が安定せず、マッチ力や火力が不安定。","createdAt":"2026-09-01T06:28:46.729Z","updatedAt":"2026-09-01T09:18:51.482Z"},{"id":"bda7aad3-58ad-464e-b1cd-f672a1e16ff5","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":11,"speaker":"こいし　解説","body":"結果として、元から優秀だった火傷の付与量はそのままに、マッチ、耐久、火力が全体的に大きく伸びています。","createdAt":"2026-09-01T06:28:46.729Z","updatedAt":"2026-09-01T09:18:51.482Z"},{"id":"c116c8bc-9423-46be-b3d5-8fc856375b91","chapterId":"83880fef-7f21-461b-8b13-65d1340612bc","position":12,"speaker":"こいし　解説","body":"さてここで皆さん薄っすらと思っていらっしゃるかもしれませんね。","createdAt":"2026-09-04T08:02:54.924Z","updatedAt":"2026-09-04T08:10:57.741Z"},{"id":"c1830d32-a3b1-4760-b118-d9642302ba43","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":28,"speaker":"こいし　解説","body":"『孤独なフィクサー』の由来もあり、単体で使ってもかなり優秀。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"c2326e99-2487-4a2d-866e-20a5a7cd8070","chapterId":"83880fef-7f21-461b-8b13-65d1340612bc","position":5,"speaker":"こいし　解説","body":"ステージクリアごとに強化され、３ステージをクリアすれば最大強化です。","createdAt":"2026-09-04T07:57:23.187Z","updatedAt":"2026-09-04T08:10:57.741Z"},{"id":"c2ea7fb1-4a64-428d-affa-d90107247ca8","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":24,"speaker":"こいし　解説","body":"編成汎用性には難があるため、こちらは2点とします。","createdAt":"2026-09-01T06:28:46.729Z","updatedAt":"2026-09-01T09:18:51.482Z"},{"id":"c5eb6e99-98e2-4d82-a9cb-6c0df8c5b003","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":10,"speaker":"こいし　解説","body":"混乱区間の削除、基礎威力の増加、精神力のストッパー、そして常時バリアまで貰えるようになりました。","createdAt":"2026-09-01T06:28:46.729Z","updatedAt":"2026-09-01T09:18:51.482Z"},{"id":"c8b84076-3ba9-494a-a0eb-7c1261958393","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":22,"speaker":"こいし　解説","body":"時計や鎮魂など、加算コイン強化ギフトとの相性は抜群です。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"cb510dd3-d93e-433d-9f62-d8e17f296a06","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":6,"speaker":"こいし　解説","body":"彼女の戦法は、自傷火傷を受けながらも、高い火力で殴っていくというものです。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"cc728c3a-3b2d-4f37-9f77-5c85511d12f5","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":32,"speaker":"こいし　解説","body":"夜明事務所、代表、グレゴール。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"d0ace076-87e4-4dbd-80b3-edd0f75db8e5","chapterId":"814500a4-43c4-438a-9805-944607cee764","position":7,"speaker":"こいし　解説","body":"編成汎用性は、周囲から受けるシナジーを切り離したとき、その人格が単体でどこまで性能を発揮できるかを見る項目です。","createdAt":"2026-09-01T06:29:53.405Z","updatedAt":"2026-09-01T09:27:14.392Z"},{"id":"d0c1d9da-1ebc-4462-90d6-7e46bbc51ac4","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":18,"speaker":"こいし　解説","body":"火傷人格なので、鏡周回の適性も高くなりがちです。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"d1fe5712-5802-4c90-a9ae-e71274b7b421","chapterId":"83880fef-7f21-461b-8b13-65d1340612bc","position":6,"speaker":"こいし　解説","body":"一方でステージクリアを失敗すると、ペナルティが発生。","createdAt":"2026-09-04T07:58:23.170Z","updatedAt":"2026-09-04T08:10:57.741Z"},{"id":"d76566cf-1ff8-4af7-837e-38b1e3588655","chapterId":"83880fef-7f21-461b-8b13-65d1340612bc","position":2,"speaker":"こいし　解説","body":"人差し指には共通しているのは、「指令ギミック」です。","createdAt":"2026-09-04T07:50:33.055Z","updatedAt":"2026-09-04T08:10:57.741Z"},{"id":"d8920b30-bbce-44e8-9e06-0e032903e493","chapterId":"814500a4-43c4-438a-9805-944607cee764","position":13,"speaker":"こいし　解説","body":"点数の目安としては、完全独立で動けるなら5点。","createdAt":"2026-09-01T06:29:53.405Z","updatedAt":"2026-09-01T09:27:14.392Z"},{"id":"db3e49b4-cc39-40b5-813f-68569f89a29a","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":43,"speaker":"こいし　解説","body":"それとは別に夜明事務所に撒くバフも強く、ユナファウもシンクレアもかなり強化できます。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-02T09:15:01.445Z"},{"id":"ddd01ccc-f400-4dc8-8976-7ce87b095ae8","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":9,"speaker":"こいし　解説","body":"しかし火力が高い分、炎蝶の棺による自傷火傷で体力の消耗も激しいです。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"dfa26db4-390a-436a-9c84-28a52f4b0af1","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":41,"speaker":"こいし　解説","body":"ただし、強化S3を撃てば回復できるためこちらも問題ありません。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-02T09:14:32.743Z"},{"id":"dfe0c3ab-ddd9-464a-b37a-35314f21516e","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":39,"speaker":"こいし　解説","body":"さらに援護防御持ちで、味方のカバーもできるのがいいですね。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-02T09:14:32.585Z"},{"id":"e03ca314-81bc-4a48-9d0a-26c87dc1279c","chapterId":"814500a4-43c4-438a-9805-944607cee764","position":14,"speaker":"こいし　解説","body":"基本性能が自己完結していたり、少し工夫すれば色んな編成で使えるなら4点。","createdAt":"2026-09-01T06:29:53.405Z","updatedAt":"2026-09-01T09:27:14.392Z"},{"id":"e119d7fb-a607-4f1d-a1a4-597e12434618","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":35,"speaker":"こいし　解説","body":"夜明事務所代表サルヴァドールの人格を被ったグレゴールです。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"e1fdde75-7263-4b60-ac64-8f1f3e0f678c","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":16,"speaker":"こいし　解説","body":"経験値採光はもちろん、火傷ワードということで鏡周回でも非常に優秀です。","createdAt":"2026-09-01T09:14:25.617Z","updatedAt":"2026-09-01T09:18:51.482Z"},{"id":"e33265b5-ecd3-4e09-a14a-adc7c11eba44","chapterId":"814500a4-43c4-438a-9805-944607cee764","position":5,"speaker":"こいし　解説","body":"ただし個人的に、『運用幅』という用語には違和感がありました。","createdAt":"2026-09-01T06:29:53.405Z","updatedAt":"2026-09-01T09:27:14.392Z"},{"id":"e355768c-06ab-4282-8323-43aabf236a67","chapterId":"4f999f2f-ab79-411a-a9f9-083f5b2b79af","position":1,"speaker":"こいし　解説","body":"といったところで、夜明事務所の解説とインフレ予想をしてきました。","createdAt":"2026-09-01T06:31:33.316Z","updatedAt":"2026-09-01T06:31:33.316Z"},{"id":"e3a08874-6fce-4c8e-ba1d-d75f4a18ee0f","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":10,"speaker":"こいし　解説","body":"ただし、守備から出せる特殊S3を使えば大きく回復できます。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"e4d1b4b8-8531-4e45-b85c-b1297494170a","chapterId":"814500a4-43c4-438a-9805-944607cee764","position":12,"speaker":"こいし　解説","body":"汎用性が低くても他が高ければ、一点特化型になります。","createdAt":"2026-09-01T06:29:53.405Z","updatedAt":"2026-09-01T09:27:14.392Z"},{"id":"e6799cbe-7768-4a3b-b594-f9701111e9a3","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":34,"speaker":"こいし　解説","body":"かつて煙戦争で名を挙げたフィクサーが一人。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"e901e9a8-c007-42ac-9d8c-7f845314e8cf","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":11,"speaker":"こいし　解説","body":"そのためアタッカーでありながら、実質的な耐久もかなり高いといった始末。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"e9ab9ddf-dd60-4607-857f-4e33d367cc72","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":21,"speaker":"こいし　解説","body":"魅力は、5コインのS3を連発できること。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"ea86e29b-f3de-4547-87b1-3b8631b2b852","chapterId":"b51ca3d0-c933-46d2-90c8-ef92ec2c9ff9","position":1,"speaker":"こいし","body":"あ","createdAt":"2026-09-04T07:19:00.618Z","updatedAt":"2026-09-04T07:19:00.618Z"},{"id":"eab8ce20-adfc-4484-b947-c3590698ea6c","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":28,"speaker":"こいし　解説","body":"評価基準については、この4つです。","createdAt":"2026-09-01T06:28:46.729Z","updatedAt":"2026-09-01T09:18:51.482Z"},{"id":"eb168fd2-f66b-497d-9c80-d6f1ce28168d","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":55,"speaker":"こいし　解説","body":"さて汎用性については、優れた高ステータスと援護防御は編成を選びません。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-02T09:17:29.503Z"},{"id":"ee0acf8f-fca2-4063-b7ad-48bc15be37c3","chapterId":"5e5b6f84-ec2a-4e6a-8b34-9ed7f95009b0","position":1,"speaker":"こいし","body":"あ","createdAt":"2026-09-04T07:18:46.158Z","updatedAt":"2026-09-04T07:18:46.158Z"},{"id":"ef31257a-8c75-4140-9d03-811bacd7863e","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":20,"speaker":"こいし　解説","body":"加えて振動ワード扱いもされるようになり、火傷振動パで採用可能に。","createdAt":"2026-09-01T06:28:46.729Z","updatedAt":"2026-09-01T09:18:51.482Z"},{"id":"f077858d-de69-418b-9466-e778dc267f22","chapterId":"83880fef-7f21-461b-8b13-65d1340612bc","position":3,"speaker":"こいし　解説","body":"毎ターンスキルスロットと敵の中から一つずつ、指令対象が選ばれます。","createdAt":"2026-09-04T07:55:42.989Z","updatedAt":"2026-09-04T08:10:57.741Z"},{"id":"f341adca-485c-41d5-98ce-7786c0dbcd6b","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":38,"speaker":"こいし　解説","body":"暁の火があれば、S1やS2にコインが追加され、マッチで隙を晒しにくい。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-02T09:13:08.189Z"},{"id":"f418d643-e344-49a2-a32a-bf179231e653","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":21,"speaker":"こいし　解説","body":"ただしS3は単コインで、鎮魂や時計の恩恵を受けにくい。","createdAt":"2026-09-01T06:28:46.729Z","updatedAt":"2026-09-01T09:18:51.482Z"},{"id":"f57d849a-678c-4c54-94a5-413cde0744c5","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":59,"speaker":"こいし　解説","body":"特に夜明事務所は、お互いがお互いを支え合って、まさに最強です。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-02T09:18:01.352Z"},{"id":"f6f2d536-30f4-484d-b83f-205feadaee55","chapterId":"4f999f2f-ab79-411a-a9f9-083f5b2b79af","position":7,"speaker":"こいし　解説","body":"ご意見があれば、どうぞお願いします。","createdAt":"2026-09-01T06:31:33.316Z","updatedAt":"2026-09-01T06:31:33.316Z"},{"id":"f78c1f38-a99e-4726-83ce-cd80790e954c","chapterId":"e28c8526-fb43-4c6f-939e-cfb40ac7678e","position":12,"speaker":"こいし　解説","body":"恩恵はかなり大きく、どのステージに連れていっても仕事をこなせるようになりましたね。","createdAt":"2026-09-01T06:28:46.729Z","updatedAt":"2026-09-01T09:18:51.482Z"},{"id":"fbd5e217-11d3-4175-b137-1c5097198092","chapterId":"e4587b19-39c1-4d04-980b-f33780d954ab","position":17,"speaker":"こいし　解説","body":"そこは楽しみに待ってみましょう。","createdAt":"2026-09-02T09:26:29.746Z","updatedAt":"2026-09-02T09:27:29.997Z"},{"id":"fd353dea-c9f9-4033-890d-93ee63b80377","chapterId":"e4587b19-39c1-4d04-980b-f33780d954ab","position":13,"speaker":"こいし　解説","body":"シーズン8ではこの流れが続き、上澄みがさらに厚くなると予想します。","createdAt":"2026-09-01T06:30:35.754Z","updatedAt":"2026-09-02T09:27:29.997Z"},{"id":"fd8c5909-0c2c-40e3-9a61-70d0fbaccce5","chapterId":"f7a47152-0e33-4415-9e31-0ebc4d774144","position":3,"speaker":"こいし","body":"指令ならば、どんなに残酷で意味不明なことでも遂行しなければならない。","createdAt":"2026-09-04T07:20:23.252Z","updatedAt":"2026-09-04T07:29:24.179Z"},{"id":"fdab770a-67e1-49eb-b394-81cdd63aa406","chapterId":"83880fef-7f21-461b-8b13-65d1340612bc","position":11,"speaker":"こいし　解説","body":"このボーナスの中に、毎ターンの精神回復があるのが大事になってきますよ。","createdAt":"2026-09-04T08:01:24.580Z","updatedAt":"2026-09-04T08:10:57.741Z"},{"id":"fdbeca9f-7c8b-4f7b-ae35-c2758ce6b7e5","chapterId":"94eefba2-5cdf-45f1-8782-027384e38869","position":12,"speaker":"こいし　解説","body":"耐久も火力も一線級。攻略評価は5点です。","createdAt":"2026-09-01T06:30:05.788Z","updatedAt":"2026-09-01T09:37:46.848Z"},{"id":"fe0f4dcc-b9fb-4949-9aae-35796ea5c512","chapterId":"4f999f2f-ab79-411a-a9f9-083f5b2b79af","position":6,"speaker":"こいし　解説","body":"また四軸については、一旦この方針でいこうと思います。","createdAt":"2026-09-01T06:31:33.316Z","updatedAt":"2026-09-01T06:31:33.316Z"},{"id":"ff078596-ce22-4eda-b19b-07862791e097","chapterId":"e4587b19-39c1-4d04-980b-f33780d954ab","position":1,"speaker":"こいし　解説","body":"ここからは話を変えて、シーズン8のインフレを予想します。","createdAt":"2026-09-01T06:30:35.754Z","updatedAt":"2026-09-02T09:27:29.997Z"}],"speakers":[{"id":"745490ec-1003-497c-9d3e-2e8b79779033","name":"さとり","position":4,"createdAt":"2026-08-26T15:30:46.078Z","updatedAt":"2026-08-26T15:31:00.563Z"},{"id":"afc38960-9ce7-4949-b8dc-6add90f8f017","name":"ナレーション","position":3,"createdAt":"2026-08-26T15:30:24.165Z","updatedAt":"2026-08-26T15:30:58.305Z"},{"id":"e0e099f3-1589-463b-96b6-3d8ae119468d","name":"こいし　解説","position":1,"createdAt":"2026-08-26T15:30:24.165Z","updatedAt":"2026-08-30T19:20:30.021Z"},{"id":"ffaad596-0c33-4f19-8b44-dcfe9a9156f7","name":"こいし","position":2,"createdAt":"2026-08-26T15:30:24.165Z","updatedAt":"2026-08-30T19:20:32.329Z"}],"notes":[{"id":"a2a20c97-9e3d-4d12-a9d9-e6c00d6079fa","projectId":null,"body":"# **構成案**\n\n## **1. 冒頭**\n### **1.1 導入**\n1. 人差し指\n2. 裏路地の五大組織こと指の一角であり、指令を重んじる組織。\n3. 武力に物を言わせる反社が揃う指の中では珍しく、／芸術的な活動に力を入れている。\n4. しかし都市で芸術をやってるやつにまともなやつはいない／とはよくいったもので、\n5. 彼らも人間の苦痛を素材にして／\"芸術\"を作り上げる。\n6. Paint the debuff , Create the artwork／デバフを塗りたくり、作品を作れ。\n7. 今回は、そんな薬指編成の動かし方を解説していきます。\n### **1.2 タイトル**\n8. 編成解説！人差し指のつかいかたについて\n\n## **2. 人差し指編成の基礎**\n### **2.1 人差し指編成の共通ギミック**\nまずは、どの型にも共通する人差し指編成の仕組みから見ていきます\n・指令ギミック：スキルスロットと敵から指令対象が選ばれる。\n・ざっくり指令のスキルで指令の敵を殴ればステージクリア。\n・ステージクリアごとに強化され、３ステージクリアすれば最大強化です\n・一方でステージクリアを失敗するとペナルティ発生\n・どんどん耐久が脆くなるので、早めに３ステクリアしたいところ\n・ちなみにドンキとイサンのような上級組織員は、ペナルティを得る代わりにステージスキップができる。\n・そして更にステージクリアごとにボーナスが解禁されるオマケつき。\n・このボーナスに毎ターンの精神回復があるのが大事になってくる。\n・あ、ファウストにそんな抜け道はないので、地道に指令を達成するしかない。\n\n### **2.2 編成を組む際の軸**\n\n### **2.3 得意な状況と弱点**\n\n## **3. 編成その1：GS型**\n### **3.1 編成**\n\n### **3.2 狙いと役割**\n\n### **3.3 運用**\n\n##… [truncated for model]","name":"Markdownメモ","createdAt":"2026-08-30T18:34:19.066Z","updatedAt":"2026-09-04T08:02:03.755Z"}],"identityItems":[{"id":"07ed60ba-6975-4edc-92de-c154fa83382f","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-mist","sectionId":"performance","fieldKey":null,"label":"パッシブ３","placeholder":"自由項目のメモ","position":9,"body":"【最強】憤怒３保有条件。\nターン開始時、この人格が出場したターン数に比例してクイック1を得る（最大5）。敵との速度差１につき、全スキルの最終威力＋１（最大５）、ダメージ量＋10%（最大50%）。","updatedAt":"2026-08-28T03:55:02.381Z"},{"id":"13908163-82a7-4acd-9f83-ae091f6f4a88","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-mist","sectionId":"performance","fieldKey":null,"label":"スキル3-2","placeholder":"自由項目のメモ","position":5,"body":"【大切断-横】：憤怒属性、斬撃タイプ。基礎威力25、コイン威力10×1枚。7枠広域攻撃。\n[使用時]対象の出血３につき、ダメージ量＋10％（最大100%）\n[使用時]このスキルの攻撃加重値よりも低い攻撃対象1につき、ダメージ量+50%(集中戦闘の場合は部位で判定)\nⅠ[的中時]出血10を付与\n　　　　出血回数5を付与\n　　　　脆弱3を付与\n　　　　麻痺5を付与","updatedAt":"2026-08-28T02:37:57.203Z"},{"id":"d4f87007-f6e1-4763-be55-60e9f50ba81b","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-mist","sectionId":"performance","fieldKey":null,"label":"パッシブ2","placeholder":"自由項目のメモ","position":8,"body":"【赤い霧-E.G.O発現】\nターン終了時に精神力が30以上があるとき、E.G.O発現状態になる。\n全スキルの最終威力＋５、ダメージ量+50%\n\"赤い霧\"を1獲得する\nターン終了時に自身が混乱してるならこれを解除し、スロットにスキル3を1つ追加\nこのターン中に100以上のダメージを与えられなかった場合、ターン終了時に精神力に20のダメージを受ける。\nターン終了時に精神が0未満の場合、精神が0にリセットされてE.G.O発現状態が解除される。","updatedAt":"2026-08-28T04:08:52.834Z"},{"id":"default:chochokun07%40gmail.com:black-silence:combat:combatFeatures","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"black-silence","sectionId":"combat","fieldKey":"combatFeatures","label":"戦闘時の特徴","placeholder":"攻撃の流れ、得意な距離、目立つ挙動など","position":2,"body":"","updatedAt":"2026-08-28T00:57:43.389Z"},{"id":"default:chochokun07%40gmail.com:black-silence:combat:differences","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"black-silence","sectionId":"combat","fieldKey":"differences","label":"他の特色との差異","placeholder":"役割、戦い方、見せ場の違いなど","position":3,"body":"","updatedAt":"2026-08-28T00:57:43.389Z"},{"id":"default:chochokun07%40gmail.com:black-silence:combat:weaponsAbilities","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"black-silence","sectionId":"combat","fieldKey":"weaponsAbilities","label":"判明している武器・能力","placeholder":"武器、E.G.O、固有能力、演出から読み取れる要素など","position":1,"body":"","updatedAt":"2026-08-28T00:57:43.389Z"},{"id":"default:chochokun07%40gmail.com:black-silence:identity:aliasMeaning","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"black-silence","sectionId":"identity","fieldKey":"aliasMeaning","label":"異名の意味","placeholder":"異名の由来や、名前から受ける印象をメモ","position":1,"body":"","updatedAt":"2026-08-28T00:57:43.389Z"},{"id":"default:chochokun07%40gmail.com:black-silence:identity:whyChosen","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"black-silence","sectionId":"identity","fieldKey":"whyChosen","label":"特色に選ばれた理由","placeholder":"なぜこの人物が特色と呼ばれるのかをメモ","position":3,"body":"","updatedAt":"2026-08-28T00:57:43.389Z"},{"id":"default:chochokun07%40gmail.com:black-silence:identity:worldRole","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"black-silence","sectionId":"identity","fieldKey":"worldRole","label":"Project Moon作品内での立場","placeholder":"登場作品、所属、物語上の役割などをメモ","position":2,"body":"","updatedAt":"2026-08-28T00:57:43.389Z"},{"id":"default:chochokun07%40gmail.com:black-silence:operation:basicLoop","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"black-silence","sectionId":"operation","fieldKey":"basicLoop","label":"基本の立ち回り","placeholder":"普段どのスキルを振り、何を維持するか","position":1,"body":"","updatedAt":"2026-08-28T00:57:43.389Z"},{"id":"default:chochokun07%40gmail.com:black-silence:operation:burden","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"black-silence","sectionId":"operation","fieldKey":"burden","label":"運用上の負担","placeholder":"資源、速度、準備、編成制約などの注意点","position":5,"body":"","updatedAt":"2026-08-28T00:57:43.389Z"},{"id":"default:chochokun07%40gmail.com:black-silence:operation:goodTeams","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"black-silence","sectionId":"operation","fieldKey":"goodTeams","label":"相性のよい編成","placeholder":"所属、色、状態異常、資源などの相性","position":3,"body":"","updatedAt":"2026-08-28T00:57:43.389Z"},{"id":"default:chochokun07%40gmail.com:black-silence:operation:powerSpike","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"black-silence","sectionId":"operation","fieldKey":"powerSpike","label":"本領発揮までの流れ","placeholder":"準備から最大出力までの流れ、目安ターンなど","position":2,"body":"","updatedAt":"2026-08-28T00:57:43.389Z"},{"id":"default:chochokun07%40gmail.com:black-silence:operation:strengths","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"black-silence","sectionId":"operation","fieldKey":"strengths","label":"強み","placeholder":"この人格を採用する理由になる点","position":4,"body":"","updatedAt":"2026-08-28T00:57:43.389Z"},{"id":"default:chochokun07%40gmail.com:black-silence:performance:defense","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"black-silence","sectionId":"performance","fieldKey":"defense","label":"守備スキル","placeholder":"守備タイプ、効果、使う場面","position":5,"body":"","updatedAt":"2026-08-28T00:57:43.389Z"},{"id":"default:chochokun07%40gmail.com:black-silence:performance:passive","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"black-silence","sectionId":"performance","fieldKey":"passive","label":"パッシブ","placeholder":"発動条件、効果、必要な資源や状態","position":6,"body":"","updatedAt":"2026-08-28T00:57:43.389Z"},{"id":"default:chochokun07%40gmail.com:black-silence:performance:skill1","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"black-silence","sectionId":"performance","fieldKey":"skill1","label":"スキル1","placeholder":"スキル名、属性、コイン、効果、担当する役割","position":2,"body":"","updatedAt":"2026-08-28T00:57:43.389Z"},{"id":"default:chochokun07%40gmail.com:black-silence:performance:skill2","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"black-silence","sectionId":"performance","fieldKey":"skill2","label":"スキル2","placeholder":"スキル名、属性、コイン、効果、担当する役割","position":3,"body":"","updatedAt":"2026-08-28T00:57:43.389Z"},{"id":"default:chochokun07%40gmail.com:black-silence:performance:skill3","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"black-silence","sectionId":"performance","fieldKey":"skill3","label":"スキル3","placeholder":"スキル名、属性、コイン、効果、担当する役割","position":4,"body":"","updatedAt":"2026-08-28T00:57:43.389Z"},{"id":"default:chochokun07%40gmail.com:black-silence:performance:spec","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"black-silence","sectionId":"performance","fieldKey":"spec","label":"基礎スペック","placeholder":"体力／速度／混乱区間／防御レベル","position":1,"body":"","updatedAt":"2026-08-28T00:57:43.389Z"},{"id":"default:chochokun07%40gmail.com:black-silence:performance:supportPassive","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"black-silence","sectionId":"performance","fieldKey":"supportPassive","label":"サポートパッシブ","placeholder":"控えから与える効果と、相性のよい編成","position":7,"body":"","updatedAt":"2026-08-28T00:57:43.389Z"},{"id":"default:chochokun07%40gmail.com:black-silence:release:assignedPrisoner","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"black-silence","sectionId":"release","fieldKey":"assignedPrisoner","label":"割り当てられそうな囚人","placeholder":"候補の囚人名","position":1,"body":"","updatedAt":"2026-08-28T00:57:43.389Z"},{"id":"default:chochokun07%40gmail.com:black-silence:release:assignmentReason","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"black-silence","sectionId":"release","fieldKey":"assignmentReason","label":"その囚人が選ばれる理由","placeholder":"武器、関係性、物語、モチーフなどの理由","position":2,"body":"","updatedAt":"2026-08-28T00:57:43.389Z"},{"id":"default:chochokun07%40gmail.com:black-silence:release:timing","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"black-silence","sectionId":"release","fieldKey":"timing","label":"実装時期","placeholder":"シーズン、イベント、実装順の予想","position":3,"body":"","updatedAt":"2026-08-28T00:57:43.389Z"},{"id":"default:chochokun07%40gmail.com:black-silence:summary:oneLine","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"black-silence","sectionId":"summary","fieldKey":"oneLine","label":"性能予想を一言で","placeholder":"動画の締めに使える短い表現","position":2,"body":"","updatedAt":"2026-08-28T00:57:43.389Z"},{"id":"default:chochokun07%40gmail.com:black-silence:summary:position","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"black-silence","sectionId":"summary","fieldKey":"position","label":"人格化した場合の立ち位置","placeholder":"ゲーム内で担う立ち位置を一文で","position":1,"body":"","updatedAt":"2026-08-28T00:57:43.389Z"},{"id":"default:chochokun07%40gmail.com:blue-echo:combat:combatFeatures","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"blue-echo","sectionId":"combat","fieldKey":"combatFeatures","label":"戦闘時の特徴","placeholder":"攻撃の流れ、得意な距離、目立つ挙動など","position":2,"body":"","updatedAt":"2026-08-28T00:57:42.269Z"},{"id":"default:chochokun07%40gmail.com:blue-echo:combat:differences","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"blue-echo","sectionId":"combat","fieldKey":"differences","label":"他の特色との差異","placeholder":"役割、戦い方、見せ場の違いなど","position":3,"body":"","updatedAt":"2026-08-28T00:57:42.269Z"},{"id":"default:chochokun07%40gmail.com:blue-echo:combat:weaponsAbilities","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"blue-echo","sectionId":"combat","fieldKey":"weaponsAbilities","label":"判明している武器・能力","placeholder":"武器、E.G.O、固有能力、演出から読み取れる要素など","position":1,"body":"","updatedAt":"2026-08-28T00:57:42.269Z"},{"id":"default:chochokun07%40gmail.com:blue-echo:identity:aliasMeaning","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"blue-echo","sectionId":"identity","fieldKey":"aliasMeaning","label":"異名の意味","placeholder":"異名の由来や、名前から受ける印象をメモ","position":1,"body":"","updatedAt":"2026-08-28T00:57:42.269Z"},{"id":"default:chochokun07%40gmail.com:blue-echo:identity:whyChosen","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"blue-echo","sectionId":"identity","fieldKey":"whyChosen","label":"特色に選ばれた理由","placeholder":"なぜこの人物が特色と呼ばれるのかをメモ","position":3,"body":"","updatedAt":"2026-08-28T00:57:42.269Z"},{"id":"default:chochokun07%40gmail.com:blue-echo:identity:worldRole","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"blue-echo","sectionId":"identity","fieldKey":"worldRole","label":"Project Moon作品内での立場","placeholder":"登場作品、所属、物語上の役割などをメモ","position":2,"body":"","updatedAt":"2026-08-28T00:57:42.269Z"},{"id":"default:chochokun07%40gmail.com:blue-echo:operation:basicLoop","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"blue-echo","sectionId":"operation","fieldKey":"basicLoop","label":"基本の立ち回り","placeholder":"普段どのスキルを振り、何を維持するか","position":1,"body":"","updatedAt":"2026-08-28T00:57:42.269Z"},{"id":"default:chochokun07%40gmail.com:blue-echo:operation:burden","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"blue-echo","sectionId":"operation","fieldKey":"burden","label":"運用上の負担","placeholder":"資源、速度、準備、編成制約などの注意点","position":5,"body":"","updatedAt":"2026-08-28T00:57:42.269Z"},{"id":"default:chochokun07%40gmail.com:blue-echo:operation:goodTeams","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"blue-echo","sectionId":"operation","fieldKey":"goodTeams","label":"相性のよい編成","placeholder":"所属、色、状態異常、資源などの相性","position":3,"body":"","updatedAt":"2026-08-28T00:57:42.269Z"},{"id":"default:chochokun07%40gmail.com:blue-echo:operation:powerSpike","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"blue-echo","sectionId":"operation","fieldKey":"powerSpike","label":"本領発揮までの流れ","placeholder":"準備から最大出力までの流れ、目安ターンなど","position":2,"body":"","updatedAt":"2026-08-28T00:57:42.269Z"},{"id":"default:chochokun07%40gmail.com:blue-echo:operation:strengths","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"blue-echo","sectionId":"operation","fieldKey":"strengths","label":"強み","placeholder":"この人格を採用する理由になる点","position":4,"body":"","updatedAt":"2026-08-28T00:57:42.269Z"},{"id":"default:chochokun07%40gmail.com:blue-echo:performance:defense","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"blue-echo","sectionId":"performance","fieldKey":"defense","label":"守備スキル","placeholder":"守備タイプ、効果、使う場面","position":5,"body":"","updatedAt":"2026-08-28T00:57:42.269Z"},{"id":"default:chochokun07%40gmail.com:blue-echo:performance:passive","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"blue-echo","sectionId":"performance","fieldKey":"passive","label":"パッシブ","placeholder":"発動条件、効果、必要な資源や状態","position":6,"body":"","updatedAt":"2026-08-28T00:57:42.269Z"},{"id":"default:chochokun07%40gmail.com:blue-echo:performance:skill1","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"blue-echo","sectionId":"performance","fieldKey":"skill1","label":"スキル1","placeholder":"スキル名、属性、コイン、効果、担当する役割","position":2,"body":"","updatedAt":"2026-08-28T00:57:42.269Z"},{"id":"default:chochokun07%40gmail.com:blue-echo:performance:skill2","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"blue-echo","sectionId":"performance","fieldKey":"skill2","label":"スキル2","placeholder":"スキル名、属性、コイン、効果、担当する役割","position":3,"body":"","updatedAt":"2026-08-28T00:57:42.269Z"},{"id":"default:chochokun07%40gmail.com:blue-echo:performance:skill3","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"blue-echo","sectionId":"performance","fieldKey":"skill3","label":"スキル3","placeholder":"スキル名、属性、コイン、効果、担当する役割","position":4,"body":"","updatedAt":"2026-08-28T00:57:42.269Z"},{"id":"default:chochokun07%40gmail.com:blue-echo:performance:spec","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"blue-echo","sectionId":"performance","fieldKey":"spec","label":"基礎スペック","placeholder":"体力／速度／混乱区間／防御レベル","position":1,"body":"","updatedAt":"2026-08-28T00:57:42.269Z"},{"id":"default:chochokun07%40gmail.com:blue-echo:performance:supportPassive","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"blue-echo","sectionId":"performance","fieldKey":"supportPassive","label":"サポートパッシブ","placeholder":"控えから与える効果と、相性のよい編成","position":7,"body":"","updatedAt":"2026-08-28T00:57:42.269Z"},{"id":"default:chochokun07%40gmail.com:blue-echo:release:assignedPrisoner","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"blue-echo","sectionId":"release","fieldKey":"assignedPrisoner","label":"割り当てられそうな囚人","placeholder":"候補の囚人名","position":1,"body":"","updatedAt":"2026-08-28T00:57:42.269Z"},{"id":"default:chochokun07%40gmail.com:blue-echo:release:assignmentReason","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"blue-echo","sectionId":"release","fieldKey":"assignmentReason","label":"その囚人が選ばれる理由","placeholder":"武器、関係性、物語、モチーフなどの理由","position":2,"body":"","updatedAt":"2026-08-28T00:57:42.269Z"},{"id":"default:chochokun07%40gmail.com:blue-echo:release:timing","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"blue-echo","sectionId":"release","fieldKey":"timing","label":"実装時期","placeholder":"シーズン、イベント、実装順の予想","position":3,"body":"","updatedAt":"2026-08-28T00:57:42.269Z"},{"id":"default:chochokun07%40gmail.com:blue-echo:summary:oneLine","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"blue-echo","sectionId":"summary","fieldKey":"oneLine","label":"性能予想を一言で","placeholder":"動画の締めに使える短い表現","position":2,"body":"","updatedAt":"2026-08-28T00:57:42.269Z"},{"id":"default:chochokun07%40gmail.com:blue-echo:summary:position","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"blue-echo","sectionId":"summary","fieldKey":"position","label":"人格化した場合の立ち位置","placeholder":"ゲーム内で担う立ち位置を一文で","position":1,"body":"","updatedAt":"2026-08-28T00:57:42.269Z"},{"id":"default:chochokun07%40gmail.com:indigo-elder:combat:combatFeatures","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"indigo-elder","sectionId":"combat","fieldKey":"combatFeatures","label":"戦闘時の特徴","placeholder":"攻撃の流れ、得意な距離、目立つ挙動など","position":2,"body":"","updatedAt":"2026-08-28T00:57:49.124Z"},{"id":"default:chochokun07%40gmail.com:indigo-elder:combat:differences","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"indigo-elder","sectionId":"combat","fieldKey":"differences","label":"他の特色との差異","placeholder":"役割、戦い方、見せ場の違いなど","position":3,"body":"","updatedAt":"2026-08-28T00:57:49.124Z"},{"id":"default:chochokun07%40gmail.com:indigo-elder:combat:weaponsAbilities","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"indigo-elder","sectionId":"combat","fieldKey":"weaponsAbilities","label":"判明している武器・能力","placeholder":"武器、E.G.O、固有能力、演出から読み取れる要素など","position":1,"body":"","updatedAt":"2026-08-28T00:57:49.124Z"},{"id":"default:chochokun07%40gmail.com:indigo-elder:identity:aliasMeaning","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"indigo-elder","sectionId":"identity","fieldKey":"aliasMeaning","label":"異名の意味","placeholder":"異名の由来や、名前から受ける印象をメモ","position":1,"body":"","updatedAt":"2026-08-28T00:57:49.124Z"},{"id":"default:chochokun07%40gmail.com:indigo-elder:identity:whyChosen","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"indigo-elder","sectionId":"identity","fieldKey":"whyChosen","label":"特色に選ばれた理由","placeholder":"なぜこの人物が特色と呼ばれるのかをメモ","position":3,"body":"","updatedAt":"2026-08-28T00:57:49.124Z"},{"id":"default:chochokun07%40gmail.com:indigo-elder:identity:worldRole","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"indigo-elder","sectionId":"identity","fieldKey":"worldRole","label":"Project Moon作品内での立場","placeholder":"登場作品、所属、物語上の役割などをメモ","position":2,"body":"","updatedAt":"2026-08-28T00:57:49.124Z"},{"id":"default:chochokun07%40gmail.com:indigo-elder:operation:basicLoop","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"indigo-elder","sectionId":"operation","fieldKey":"basicLoop","label":"基本の立ち回り","placeholder":"普段どのスキルを振り、何を維持するか","position":1,"body":"","updatedAt":"2026-08-28T00:57:49.124Z"},{"id":"default:chochokun07%40gmail.com:indigo-elder:operation:burden","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"indigo-elder","sectionId":"operation","fieldKey":"burden","label":"運用上の負担","placeholder":"資源、速度、準備、編成制約などの注意点","position":5,"body":"","updatedAt":"2026-08-28T00:57:49.124Z"},{"id":"default:chochokun07%40gmail.com:indigo-elder:operation:goodTeams","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"indigo-elder","sectionId":"operation","fieldKey":"goodTeams","label":"相性のよい編成","placeholder":"所属、色、状態異常、資源などの相性","position":3,"body":"","updatedAt":"2026-08-28T00:57:49.124Z"},{"id":"default:chochokun07%40gmail.com:indigo-elder:operation:powerSpike","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"indigo-elder","sectionId":"operation","fieldKey":"powerSpike","label":"本領発揮までの流れ","placeholder":"準備から最大出力までの流れ、目安ターンなど","position":2,"body":"","updatedAt":"2026-08-28T00:57:49.124Z"},{"id":"default:chochokun07%40gmail.com:indigo-elder:operation:strengths","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"indigo-elder","sectionId":"operation","fieldKey":"strengths","label":"強み","placeholder":"この人格を採用する理由になる点","position":4,"body":"","updatedAt":"2026-08-28T00:57:49.124Z"},{"id":"default:chochokun07%40gmail.com:indigo-elder:performance:defense","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"indigo-elder","sectionId":"performance","fieldKey":"defense","label":"守備スキル","placeholder":"守備タイプ、効果、使う場面","position":5,"body":"","updatedAt":"2026-08-28T00:57:49.124Z"},{"id":"default:chochokun07%40gmail.com:indigo-elder:performance:passive","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"indigo-elder","sectionId":"performance","fieldKey":"passive","label":"パッシブ","placeholder":"発動条件、効果、必要な資源や状態","position":6,"body":"","updatedAt":"2026-08-28T00:57:49.124Z"},{"id":"default:chochokun07%40gmail.com:indigo-elder:performance:skill1","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"indigo-elder","sectionId":"performance","fieldKey":"skill1","label":"スキル1","placeholder":"スキル名、属性、コイン、効果、担当する役割","position":2,"body":"","updatedAt":"2026-08-28T00:57:49.124Z"},{"id":"default:chochokun07%40gmail.com:indigo-elder:performance:skill2","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"indigo-elder","sectionId":"performance","fieldKey":"skill2","label":"スキル2","placeholder":"スキル名、属性、コイン、効果、担当する役割","position":3,"body":"","updatedAt":"2026-08-28T00:57:49.124Z"},{"id":"default:chochokun07%40gmail.com:indigo-elder:performance:skill3","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"indigo-elder","sectionId":"performance","fieldKey":"skill3","label":"スキル3","placeholder":"スキル名、属性、コイン、効果、担当する役割","position":4,"body":"","updatedAt":"2026-08-28T00:57:49.124Z"},{"id":"default:chochokun07%40gmail.com:indigo-elder:performance:spec","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"indigo-elder","sectionId":"performance","fieldKey":"spec","label":"基礎スペック","placeholder":"体力／速度／混乱区間／防御レベル","position":1,"body":"","updatedAt":"2026-08-28T00:57:49.124Z"},{"id":"default:chochokun07%40gmail.com:indigo-elder:performance:supportPassive","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"indigo-elder","sectionId":"performance","fieldKey":"supportPassive","label":"サポートパッシブ","placeholder":"控えから与える効果と、相性のよい編成","position":7,"body":"","updatedAt":"2026-08-28T00:57:49.124Z"},{"id":"default:chochokun07%40gmail.com:indigo-elder:release:assignedPrisoner","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"indigo-elder","sectionId":"release","fieldKey":"assignedPrisoner","label":"割り当てられそうな囚人","placeholder":"候補の囚人名","position":1,"body":"","updatedAt":"2026-08-28T00:57:49.124Z"},{"id":"default:chochokun07%40gmail.com:indigo-elder:release:assignmentReason","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"indigo-elder","sectionId":"release","fieldKey":"assignmentReason","label":"その囚人が選ばれる理由","placeholder":"武器、関係性、物語、モチーフなどの理由","position":2,"body":"","updatedAt":"2026-08-28T00:57:49.124Z"},{"id":"default:chochokun07%40gmail.com:indigo-elder:release:timing","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"indigo-elder","sectionId":"release","fieldKey":"timing","label":"実装時期","placeholder":"シーズン、イベント、実装順の予想","position":3,"body":"","updatedAt":"2026-08-28T00:57:49.124Z"},{"id":"default:chochokun07%40gmail.com:indigo-elder:summary:oneLine","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"indigo-elder","sectionId":"summary","fieldKey":"oneLine","label":"性能予想を一言で","placeholder":"動画の締めに使える短い表現","position":2,"body":"","updatedAt":"2026-08-28T00:57:49.124Z"},{"id":"default:chochokun07%40gmail.com:indigo-elder:summary:position","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"indigo-elder","sectionId":"summary","fieldKey":"position","label":"人格化した場合の立ち位置","placeholder":"ゲーム内で担う立ち位置を一文で","position":1,"body":"","updatedAt":"2026-08-28T00:57:49.124Z"},{"id":"default:chochokun07%40gmail.com:purple-tears:combat:combatFeatures","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"purple-tears","sectionId":"combat","fieldKey":"combatFeatures","label":"戦闘時の特徴","placeholder":"攻撃の流れ、得意な距離、目立つ挙動など","position":2,"body":"","updatedAt":"2026-08-28T00:57:44.571Z"},{"id":"default:chochokun07%40gmail.com:purple-tears:combat:differences","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"purple-tears","sectionId":"combat","fieldKey":"differences","label":"他の特色との差異","placeholder":"役割、戦い方、見せ場の違いなど","position":3,"body":"","updatedAt":"2026-08-28T00:57:44.571Z"},{"id":"default:chochokun07%40gmail.com:purple-tears:combat:weaponsAbilities","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"purple-tears","sectionId":"combat","fieldKey":"weaponsAbilities","label":"判明している武器・能力","placeholder":"武器、E.G.O、固有能力、演出から読み取れる要素など","position":1,"body":"","updatedAt":"2026-08-28T00:57:44.571Z"},{"id":"default:chochokun07%40gmail.com:purple-tears:identity:aliasMeaning","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"purple-tears","sectionId":"identity","fieldKey":"aliasMeaning","label":"異名の意味","placeholder":"異名の由来や、名前から受ける印象をメモ","position":1,"body":"","updatedAt":"2026-08-28T00:57:44.571Z"},{"id":"default:chochokun07%40gmail.com:purple-tears:identity:whyChosen","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"purple-tears","sectionId":"identity","fieldKey":"whyChosen","label":"特色に選ばれた理由","placeholder":"なぜこの人物が特色と呼ばれるのかをメモ","position":3,"body":"","updatedAt":"2026-08-28T00:57:44.571Z"},{"id":"default:chochokun07%40gmail.com:purple-tears:identity:worldRole","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"purple-tears","sectionId":"identity","fieldKey":"worldRole","label":"Project Moon作品内での立場","placeholder":"登場作品、所属、物語上の役割などをメモ","position":2,"body":"","updatedAt":"2026-08-28T00:57:44.571Z"},{"id":"default:chochokun07%40gmail.com:purple-tears:operation:basicLoop","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"purple-tears","sectionId":"operation","fieldKey":"basicLoop","label":"基本の立ち回り","placeholder":"普段どのスキルを振り、何を維持するか","position":1,"body":"","updatedAt":"2026-08-28T00:57:44.571Z"},{"id":"default:chochokun07%40gmail.com:purple-tears:operation:burden","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"purple-tears","sectionId":"operation","fieldKey":"burden","label":"運用上の負担","placeholder":"資源、速度、準備、編成制約などの注意点","position":5,"body":"","updatedAt":"2026-08-28T00:57:44.571Z"},{"id":"default:chochokun07%40gmail.com:purple-tears:operation:goodTeams","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"purple-tears","sectionId":"operation","fieldKey":"goodTeams","label":"相性のよい編成","placeholder":"所属、色、状態異常、資源などの相性","position":3,"body":"","updatedAt":"2026-08-28T00:57:44.571Z"},{"id":"default:chochokun07%40gmail.com:purple-tears:operation:powerSpike","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"purple-tears","sectionId":"operation","fieldKey":"powerSpike","label":"本領発揮までの流れ","placeholder":"準備から最大出力までの流れ、目安ターンなど","position":2,"body":"","updatedAt":"2026-08-28T00:57:44.571Z"},{"id":"default:chochokun07%40gmail.com:purple-tears:operation:strengths","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"purple-tears","sectionId":"operation","fieldKey":"strengths","label":"強み","placeholder":"この人格を採用する理由になる点","position":4,"body":"","updatedAt":"2026-08-28T00:57:44.571Z"},{"id":"default:chochokun07%40gmail.com:purple-tears:performance:defense","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"purple-tears","sectionId":"performance","fieldKey":"defense","label":"守備スキル","placeholder":"守備タイプ、効果、使う場面","position":5,"body":"","updatedAt":"2026-08-28T00:57:44.571Z"},{"id":"default:chochokun07%40gmail.com:purple-tears:performance:passive","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"purple-tears","sectionId":"performance","fieldKey":"passive","label":"パッシブ","placeholder":"発動条件、効果、必要な資源や状態","position":6,"body":"","updatedAt":"2026-08-28T00:57:44.571Z"},{"id":"default:chochokun07%40gmail.com:purple-tears:performance:skill1","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"purple-tears","sectionId":"performance","fieldKey":"skill1","label":"スキル1","placeholder":"スキル名、属性、コイン、効果、担当する役割","position":2,"body":"","updatedAt":"2026-08-28T00:57:44.571Z"},{"id":"default:chochokun07%40gmail.com:purple-tears:performance:skill2","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"purple-tears","sectionId":"performance","fieldKey":"skill2","label":"スキル2","placeholder":"スキル名、属性、コイン、効果、担当する役割","position":3,"body":"","updatedAt":"2026-08-28T00:57:44.571Z"},{"id":"default:chochokun07%40gmail.com:purple-tears:performance:skill3","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"purple-tears","sectionId":"performance","fieldKey":"skill3","label":"スキル3","placeholder":"スキル名、属性、コイン、効果、担当する役割","position":4,"body":"","updatedAt":"2026-08-28T00:57:44.571Z"},{"id":"default:chochokun07%40gmail.com:purple-tears:performance:spec","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"purple-tears","sectionId":"performance","fieldKey":"spec","label":"基礎スペック","placeholder":"体力／速度／混乱区間／防御レベル","position":1,"body":"","updatedAt":"2026-08-28T00:57:44.571Z"},{"id":"default:chochokun07%40gmail.com:purple-tears:performance:supportPassive","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"purple-tears","sectionId":"performance","fieldKey":"supportPassive","label":"サポートパッシブ","placeholder":"控えから与える効果と、相性のよい編成","position":7,"body":"","updatedAt":"2026-08-28T00:57:44.571Z"},{"id":"default:chochokun07%40gmail.com:purple-tears:release:assignedPrisoner","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"purple-tears","sectionId":"release","fieldKey":"assignedPrisoner","label":"割り当てられそうな囚人","placeholder":"候補の囚人名","position":1,"body":"","updatedAt":"2026-08-28T00:57:44.571Z"},{"id":"default:chochokun07%40gmail.com:purple-tears:release:assignmentReason","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"purple-tears","sectionId":"release","fieldKey":"assignmentReason","label":"その囚人が選ばれる理由","placeholder":"武器、関係性、物語、モチーフなどの理由","position":2,"body":"","updatedAt":"2026-08-28T00:57:44.571Z"},{"id":"default:chochokun07%40gmail.com:purple-tears:release:timing","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"purple-tears","sectionId":"release","fieldKey":"timing","label":"実装時期","placeholder":"シーズン、イベント、実装順の予想","position":3,"body":"","updatedAt":"2026-08-28T00:57:44.571Z"},{"id":"default:chochokun07%40gmail.com:purple-tears:summary:oneLine","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"purple-tears","sectionId":"summary","fieldKey":"oneLine","label":"性能予想を一言で","placeholder":"動画の締めに使える短い表現","position":2,"body":"","updatedAt":"2026-08-28T00:57:44.571Z"},{"id":"default:chochokun07%40gmail.com:purple-tears:summary:position","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"purple-tears","sectionId":"summary","fieldKey":"position","label":"人格化した場合の立ち位置","placeholder":"ゲーム内で担う立ち位置を一文で","position":1,"body":"","updatedAt":"2026-08-28T00:57:44.571Z"},{"id":"default:chochokun07%40gmail.com:red-gaze:combat:combatFeatures","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-gaze","sectionId":"combat","fieldKey":"combatFeatures","label":"戦闘時の特徴","placeholder":"攻撃の流れ、得意な距離、目立つ挙動など","position":2,"body":"","updatedAt":"2026-08-28T00:57:45.699Z"},{"id":"default:chochokun07%40gmail.com:red-gaze:combat:differences","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-gaze","sectionId":"combat","fieldKey":"differences","label":"他の特色との差異","placeholder":"役割、戦い方、見せ場の違いなど","position":3,"body":"","updatedAt":"2026-08-28T00:57:45.699Z"},{"id":"default:chochokun07%40gmail.com:red-gaze:combat:weaponsAbilities","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-gaze","sectionId":"combat","fieldKey":"weaponsAbilities","label":"判明している武器・能力","placeholder":"武器、E.G.O、固有能力、演出から読み取れる要素など","position":1,"body":"","updatedAt":"2026-08-28T00:57:45.699Z"},{"id":"default:chochokun07%40gmail.com:red-gaze:identity:aliasMeaning","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-gaze","sectionId":"identity","fieldKey":"aliasMeaning","label":"異名の意味","placeholder":"異名の由来や、名前から受ける印象をメモ","position":1,"body":"","updatedAt":"2026-08-28T00:57:45.699Z"},{"id":"default:chochokun07%40gmail.com:red-gaze:identity:whyChosen","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-gaze","sectionId":"identity","fieldKey":"whyChosen","label":"特色に選ばれた理由","placeholder":"なぜこの人物が特色と呼ばれるのかをメモ","position":3,"body":"","updatedAt":"2026-08-28T00:57:45.699Z"},{"id":"default:chochokun07%40gmail.com:red-gaze:identity:worldRole","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-gaze","sectionId":"identity","fieldKey":"worldRole","label":"Project Moon作品内での立場","placeholder":"登場作品、所属、物語上の役割などをメモ","position":2,"body":"","updatedAt":"2026-08-28T00:57:45.699Z"},{"id":"default:chochokun07%40gmail.com:red-gaze:operation:basicLoop","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-gaze","sectionId":"operation","fieldKey":"basicLoop","label":"基本の立ち回り","placeholder":"普段どのスキルを振り、何を維持するか","position":1,"body":"","updatedAt":"2026-08-28T00:57:45.699Z"},{"id":"default:chochokun07%40gmail.com:red-gaze:operation:burden","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-gaze","sectionId":"operation","fieldKey":"burden","label":"運用上の負担","placeholder":"資源、速度、準備、編成制約などの注意点","position":5,"body":"","updatedAt":"2026-08-28T00:57:45.699Z"},{"id":"default:chochokun07%40gmail.com:red-gaze:operation:goodTeams","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-gaze","sectionId":"operation","fieldKey":"goodTeams","label":"相性のよい編成","placeholder":"所属、色、状態異常、資源などの相性","position":3,"body":"","updatedAt":"2026-08-28T00:57:45.699Z"},{"id":"default:chochokun07%40gmail.com:red-gaze:operation:powerSpike","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-gaze","sectionId":"operation","fieldKey":"powerSpike","label":"本領発揮までの流れ","placeholder":"準備から最大出力までの流れ、目安ターンなど","position":2,"body":"","updatedAt":"2026-08-28T00:57:45.699Z"},{"id":"default:chochokun07%40gmail.com:red-gaze:operation:strengths","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-gaze","sectionId":"operation","fieldKey":"strengths","label":"強み","placeholder":"この人格を採用する理由になる点","position":4,"body":"","updatedAt":"2026-08-28T00:57:45.699Z"},{"id":"default:chochokun07%40gmail.com:red-gaze:performance:defense","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-gaze","sectionId":"performance","fieldKey":"defense","label":"守備スキル","placeholder":"守備タイプ、効果、使う場面","position":5,"body":"","updatedAt":"2026-08-28T00:57:45.699Z"},{"id":"default:chochokun07%40gmail.com:red-gaze:performance:passive","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-gaze","sectionId":"performance","fieldKey":"passive","label":"パッシブ","placeholder":"発動条件、効果、必要な資源や状態","position":6,"body":"","updatedAt":"2026-08-28T00:57:45.699Z"},{"id":"default:chochokun07%40gmail.com:red-gaze:performance:skill1","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-gaze","sectionId":"performance","fieldKey":"skill1","label":"スキル1","placeholder":"スキル名、属性、コイン、効果、担当する役割","position":2,"body":"","updatedAt":"2026-08-28T00:57:45.699Z"},{"id":"default:chochokun07%40gmail.com:red-gaze:performance:skill2","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-gaze","sectionId":"performance","fieldKey":"skill2","label":"スキル2","placeholder":"スキル名、属性、コイン、効果、担当する役割","position":3,"body":"","updatedAt":"2026-08-28T00:57:45.699Z"},{"id":"default:chochokun07%40gmail.com:red-gaze:performance:skill3","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-gaze","sectionId":"performance","fieldKey":"skill3","label":"スキル3","placeholder":"スキル名、属性、コイン、効果、担当する役割","position":4,"body":"","updatedAt":"2026-08-28T00:57:45.699Z"},{"id":"default:chochokun07%40gmail.com:red-gaze:performance:spec","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-gaze","sectionId":"performance","fieldKey":"spec","label":"基礎スペック","placeholder":"体力／速度／混乱区間／防御レベル","position":1,"body":"","updatedAt":"2026-08-28T00:57:45.699Z"},{"id":"default:chochokun07%40gmail.com:red-gaze:performance:supportPassive","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-gaze","sectionId":"performance","fieldKey":"supportPassive","label":"サポートパッシブ","placeholder":"控えから与える効果と、相性のよい編成","position":7,"body":"","updatedAt":"2026-08-28T00:57:45.699Z"},{"id":"default:chochokun07%40gmail.com:red-gaze:release:assignedPrisoner","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-gaze","sectionId":"release","fieldKey":"assignedPrisoner","label":"割り当てられそうな囚人","placeholder":"候補の囚人名","position":1,"body":"","updatedAt":"2026-08-28T00:57:45.699Z"},{"id":"default:chochokun07%40gmail.com:red-gaze:release:assignmentReason","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-gaze","sectionId":"release","fieldKey":"assignmentReason","label":"その囚人が選ばれる理由","placeholder":"武器、関係性、物語、モチーフなどの理由","position":2,"body":"","updatedAt":"2026-08-28T00:57:45.699Z"},{"id":"default:chochokun07%40gmail.com:red-gaze:release:timing","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-gaze","sectionId":"release","fieldKey":"timing","label":"実装時期","placeholder":"シーズン、イベント、実装順の予想","position":3,"body":"","updatedAt":"2026-08-28T00:57:45.699Z"},{"id":"default:chochokun07%40gmail.com:red-gaze:summary:oneLine","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-gaze","sectionId":"summary","fieldKey":"oneLine","label":"性能予想を一言で","placeholder":"動画の締めに使える短い表現","position":2,"body":"","updatedAt":"2026-08-28T00:57:45.699Z"},{"id":"default:chochokun07%40gmail.com:red-gaze:summary:position","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-gaze","sectionId":"summary","fieldKey":"position","label":"人格化した場合の立ち位置","placeholder":"ゲーム内で担う立ち位置を一文で","position":1,"body":"","updatedAt":"2026-08-28T00:57:45.699Z"},{"id":"default:chochokun07%40gmail.com:red-mist:combat:combatFeatures","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-mist","sectionId":"combat","fieldKey":"combatFeatures","label":"戦闘時の特徴","placeholder":"攻撃の流れ、得意な距離、目立つ挙動など","position":2,"body":"","updatedAt":"2026-08-28T00:57:41.149Z"},{"id":"default:chochokun07%40gmail.com:red-mist:combat:differences","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-mist","sectionId":"combat","fieldKey":"differences","label":"他の特色との差異","placeholder":"役割、戦い方、見せ場の違いなど","position":3,"body":"","updatedAt":"2026-08-28T00:57:41.149Z"},{"id":"default:chochokun07%40gmail.com:red-mist:combat:weaponsAbilities","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-mist","sectionId":"combat","fieldKey":"weaponsAbilities","label":"判明している武器・能力","placeholder":"武器、E.G.O、固有能力、演出から読み取れる要素など","position":1,"body":"","updatedAt":"2026-08-28T00:57:41.149Z"},{"id":"default:chochokun07%40gmail.com:red-mist:identity:aliasMeaning","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-mist","sectionId":"identity","fieldKey":"aliasMeaning","label":"異名の意味","placeholder":"異名の由来や、名前から受ける印象をメモ","position":1,"body":"","updatedAt":"2026-08-28T00:57:41.149Z"},{"id":"default:chochokun07%40gmail.com:red-mist:identity:whyChosen","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-mist","sectionId":"identity","fieldKey":"whyChosen","label":"特色に選ばれた理由","placeholder":"なぜこの人物が特色と呼ばれるのかをメモ","position":3,"body":"","updatedAt":"2026-08-28T00:57:41.149Z"},{"id":"default:chochokun07%40gmail.com:red-mist:identity:worldRole","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-mist","sectionId":"identity","fieldKey":"worldRole","label":"Project Moon作品内での立場","placeholder":"登場作品、所属、物語上の役割などをメモ","position":2,"body":"","updatedAt":"2026-08-28T00:57:41.149Z"},{"id":"default:chochokun07%40gmail.com:red-mist:operation:basicLoop","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-mist","sectionId":"operation","fieldKey":"basicLoop","label":"基本の立ち回り","placeholder":"普段どのスキルを振り、何を維持するか","position":1,"body":"","updatedAt":"2026-08-28T00:57:41.149Z"},{"id":"default:chochokun07%40gmail.com:red-mist:operation:burden","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-mist","sectionId":"operation","fieldKey":"burden","label":"運用上の負担","placeholder":"資源、速度、準備、編成制約などの注意点","position":5,"body":"","updatedAt":"2026-08-28T00:57:41.149Z"},{"id":"default:chochokun07%40gmail.com:red-mist:operation:goodTeams","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-mist","sectionId":"operation","fieldKey":"goodTeams","label":"相性のよい編成","placeholder":"所属、色、状態異常、資源などの相性","position":3,"body":"","updatedAt":"2026-08-28T00:57:41.149Z"},{"id":"default:chochokun07%40gmail.com:red-mist:operation:powerSpike","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-mist","sectionId":"operation","fieldKey":"powerSpike","label":"本領発揮までの流れ","placeholder":"準備から最大出力までの流れ、目安ターンなど","position":2,"body":"","updatedAt":"2026-08-28T00:57:41.149Z"},{"id":"default:chochokun07%40gmail.com:red-mist:operation:strengths","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-mist","sectionId":"operation","fieldKey":"strengths","label":"強み","placeholder":"この人格を採用する理由になる点","position":4,"body":"","updatedAt":"2026-08-28T00:57:41.149Z"},{"id":"default:chochokun07%40gmail.com:red-mist:performance:defense","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-mist","sectionId":"performance","fieldKey":"defense","label":"守備スキル","placeholder":"守備タイプ、効果、使う場面","position":6,"body":"【気合い】：マッチ可能反撃。憤怒属性、斬撃タイプ。基礎威力６、コイン威力４×２枚。\n[ターン終了時]精神力を10回復する\nⅡ[的中時]次のターンに攻撃威力増加３を獲得","updatedAt":"2026-08-28T02:34:59.435Z"},{"id":"default:chochokun07%40gmail.com:red-mist:performance:passive","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-mist","sectionId":"performance","fieldKey":"passive","label":"パッシブ","placeholder":"発動条件、効果、必要な資源や状態","position":7,"body":"【赤い霧】\n敵から一方攻撃されるとき、スキル１でマッチする。（１ターンに最大１回）\nターン開始時に援護防御１を得て、援護防御発動時にスキル１でマッチをする。\n","updatedAt":"2026-08-28T02:36:47.480Z"},{"id":"default:chochokun07%40gmail.com:red-mist:performance:skill1","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-mist","sectionId":"performance","fieldKey":"skill1","label":"スキル1","placeholder":"スキル名、属性、コイン、効果、担当する役割","position":2,"body":"【横斬り】：憤怒属性、斬撃タイプ。基礎威力６、コイン威力４×2枚。\n[使用時]対象の出血４につき、最終威力＋１（最大４）\n[攻撃後]このスキルで敵に20ダメージ以上与えたなら、手元にある最もランクが低いスキルを一つ捨てる\nⅠ[的中時]出血５を付与\nⅡ[的中時]出血回数３を付与\n","updatedAt":"2026-08-28T02:25:44.460Z"},{"id":"default:chochokun07%40gmail.com:red-mist:performance:skill2","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-mist","sectionId":"performance","fieldKey":"skill2","label":"スキル2","placeholder":"スキル名、属性、コイン、効果、担当する役割","position":3,"body":"【突進】：憤怒属性、斬撃タイプ。基礎威力14、コイン威力8×1枚。\n[使用時]自身のクイック1につき、ダメージ量+20%（最大100%）\n[使用時]対象の出血5につき、最終威力+1（最大4）\n[敵討伐または混乱時]別のターゲットにこのスキルを再使用\n[再使用使用時]再使用回数1につきダメージ量+50%（最大200%）\nI[的中時]出血5を付与\n　　　　出血回数3を付与","updatedAt":"2026-08-28T04:07:02.125Z"},{"id":"default:chochokun07%40gmail.com:red-mist:performance:skill3","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-mist","sectionId":"performance","fieldKey":"skill3","label":"スキル3","placeholder":"スキル名、属性、コイン、効果、担当する役割","position":4,"body":"【大切断-縦】：憤怒属性、斬撃タイプ。基礎威力20、コイン威力10×1枚。\n[ターン開始時]自身が\"E.G.O発現\"状態のとき、【大切断-横】としてスキルスロットに入る。\n[使用時]対象の出血4につき、ダメージ量＋10％（最大50%）\nⅠ[的中時]出血7を付与\n　　　　出血回数3を付与\n　　　　麻痺2を付与","updatedAt":"2026-08-28T02:37:41.723Z"},{"id":"default:chochokun07%40gmail.com:red-mist:performance:spec","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-mist","sectionId":"performance","fieldKey":"spec","label":"基礎スペック","placeholder":"体力／速度／混乱区間／防御レベル","position":1,"body":"（レベル60基準）\nHP 273、速度5-7、混乱区間 40%、防御レベル+2、特殊精神条件。斬撃普通、貫通弱点、打撃抵抗","updatedAt":"2026-08-28T15:45:13.175Z"},{"id":"default:chochokun07%40gmail.com:red-mist:performance:supportPassive","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-mist","sectionId":"performance","fieldKey":"supportPassive","label":"サポートパッシブ","placeholder":"控えから与える効果と、相性のよい編成","position":10,"body":"【守り抜く意思】憤怒5保持。編成順が最も早い味方が保護2を得る。","updatedAt":"2026-08-28T04:12:55.191Z"},{"id":"default:chochokun07%40gmail.com:red-mist:release:assignedPrisoner","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-mist","sectionId":"release","fieldKey":"assignedPrisoner","label":"割り当てられそうな囚人","placeholder":"候補の囚人名","position":1,"body":"","updatedAt":"2026-08-28T00:57:41.149Z"},{"id":"default:chochokun07%40gmail.com:red-mist:release:assignmentReason","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-mist","sectionId":"release","fieldKey":"assignmentReason","label":"その囚人が選ばれる理由","placeholder":"武器、関係性、物語、モチーフなどの理由","position":2,"body":"","updatedAt":"2026-08-28T00:57:41.149Z"},{"id":"default:chochokun07%40gmail.com:red-mist:release:timing","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-mist","sectionId":"release","fieldKey":"timing","label":"実装時期","placeholder":"シーズン、イベント、実装順の予想","position":3,"body":"","updatedAt":"2026-08-28T00:57:41.149Z"},{"id":"default:chochokun07%40gmail.com:red-mist:summary:oneLine","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-mist","sectionId":"summary","fieldKey":"oneLine","label":"性能予想を一言で","placeholder":"動画の締めに使える短い表現","position":2,"body":"","updatedAt":"2026-08-28T00:57:41.149Z"},{"id":"default:chochokun07%40gmail.com:red-mist:summary:position","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-mist","sectionId":"summary","fieldKey":"position","label":"人格化した場合の立ち位置","placeholder":"ゲーム内で担う立ち位置を一文で","position":1,"body":"","updatedAt":"2026-08-28T00:57:41.149Z"},{"id":"default:chochokun07%40gmail.com:vermilion-cross:combat:combatFeatures","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"vermilion-cross","sectionId":"combat","fieldKey":"combatFeatures","label":"戦闘時の特徴","placeholder":"攻撃の流れ、得意な距離、目立つ挙動など","position":2,"body":"","updatedAt":"2026-08-28T00:57:46.870Z"},{"id":"default:chochokun07%40gmail.com:vermilion-cross:combat:differences","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"vermilion-cross","sectionId":"combat","fieldKey":"differences","label":"他の特色との差異","placeholder":"役割、戦い方、見せ場の違いなど","position":3,"body":"","updatedAt":"2026-08-28T00:57:46.870Z"},{"id":"default:chochokun07%40gmail.com:vermilion-cross:combat:weaponsAbilities","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"vermilion-cross","sectionId":"combat","fieldKey":"weaponsAbilities","label":"判明している武器・能力","placeholder":"武器、E.G.O、固有能力、演出から読み取れる要素など","position":1,"body":"","updatedAt":"2026-08-28T00:57:46.870Z"},{"id":"default:chochokun07%40gmail.com:vermilion-cross:identity:aliasMeaning","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"vermilion-cross","sectionId":"identity","fieldKey":"aliasMeaning","label":"異名の意味","placeholder":"異名の由来や、名前から受ける印象をメモ","position":1,"body":"","updatedAt":"2026-08-28T00:57:46.870Z"},{"id":"default:chochokun07%40gmail.com:vermilion-cross:identity:whyChosen","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"vermilion-cross","sectionId":"identity","fieldKey":"whyChosen","label":"特色に選ばれた理由","placeholder":"なぜこの人物が特色と呼ばれるのかをメモ","position":3,"body":"","updatedAt":"2026-08-28T00:57:46.870Z"},{"id":"default:chochokun07%40gmail.com:vermilion-cross:identity:worldRole","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"vermilion-cross","sectionId":"identity","fieldKey":"worldRole","label":"Project Moon作品内での立場","placeholder":"登場作品、所属、物語上の役割などをメモ","position":2,"body":"","updatedAt":"2026-08-28T00:57:46.870Z"},{"id":"default:chochokun07%40gmail.com:vermilion-cross:operation:basicLoop","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"vermilion-cross","sectionId":"operation","fieldKey":"basicLoop","label":"基本の立ち回り","placeholder":"普段どのスキルを振り、何を維持するか","position":1,"body":"","updatedAt":"2026-08-28T00:57:46.870Z"},{"id":"default:chochokun07%40gmail.com:vermilion-cross:operation:burden","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"vermilion-cross","sectionId":"operation","fieldKey":"burden","label":"運用上の負担","placeholder":"資源、速度、準備、編成制約などの注意点","position":5,"body":"","updatedAt":"2026-08-28T00:57:46.870Z"},{"id":"default:chochokun07%40gmail.com:vermilion-cross:operation:goodTeams","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"vermilion-cross","sectionId":"operation","fieldKey":"goodTeams","label":"相性のよい編成","placeholder":"所属、色、状態異常、資源などの相性","position":3,"body":"","updatedAt":"2026-08-28T00:57:46.870Z"},{"id":"default:chochokun07%40gmail.com:vermilion-cross:operation:powerSpike","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"vermilion-cross","sectionId":"operation","fieldKey":"powerSpike","label":"本領発揮までの流れ","placeholder":"準備から最大出力までの流れ、目安ターンなど","position":2,"body":"","updatedAt":"2026-08-28T00:57:46.870Z"},{"id":"default:chochokun07%40gmail.com:vermilion-cross:operation:strengths","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"vermilion-cross","sectionId":"operation","fieldKey":"strengths","label":"強み","placeholder":"この人格を採用する理由になる点","position":4,"body":"","updatedAt":"2026-08-28T00:57:46.870Z"},{"id":"default:chochokun07%40gmail.com:vermilion-cross:performance:defense","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"vermilion-cross","sectionId":"performance","fieldKey":"defense","label":"守備スキル","placeholder":"守備タイプ、効果、使う場面","position":5,"body":"","updatedAt":"2026-08-28T00:57:46.870Z"},{"id":"default:chochokun07%40gmail.com:vermilion-cross:performance:passive","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"vermilion-cross","sectionId":"performance","fieldKey":"passive","label":"パッシブ","placeholder":"発動条件、効果、必要な資源や状態","position":6,"body":"","updatedAt":"2026-08-28T00:57:46.870Z"},{"id":"default:chochokun07%40gmail.com:vermilion-cross:performance:skill1","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"vermilion-cross","sectionId":"performance","fieldKey":"skill1","label":"スキル1","placeholder":"スキル名、属性、コイン、効果、担当する役割","position":2,"body":"","updatedAt":"2026-08-28T00:57:46.870Z"},{"id":"default:chochokun07%40gmail.com:vermilion-cross:performance:skill2","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"vermilion-cross","sectionId":"performance","fieldKey":"skill2","label":"スキル2","placeholder":"スキル名、属性、コイン、効果、担当する役割","position":3,"body":"","updatedAt":"2026-08-28T00:57:46.870Z"},{"id":"default:chochokun07%40gmail.com:vermilion-cross:performance:skill3","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"vermilion-cross","sectionId":"performance","fieldKey":"skill3","label":"スキル3","placeholder":"スキル名、属性、コイン、効果、担当する役割","position":4,"body":"","updatedAt":"2026-08-28T00:57:46.870Z"},{"id":"default:chochokun07%40gmail.com:vermilion-cross:performance:spec","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"vermilion-cross","sectionId":"performance","fieldKey":"spec","label":"基礎スペック","placeholder":"体力／速度／混乱区間／防御レベル","position":1,"body":"","updatedAt":"2026-08-28T00:57:46.870Z"},{"id":"default:chochokun07%40gmail.com:vermilion-cross:performance:supportPassive","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"vermilion-cross","sectionId":"performance","fieldKey":"supportPassive","label":"サポートパッシブ","placeholder":"控えから与える効果と、相性のよい編成","position":7,"body":"","updatedAt":"2026-08-28T00:57:46.870Z"},{"id":"default:chochokun07%40gmail.com:vermilion-cross:release:assignedPrisoner","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"vermilion-cross","sectionId":"release","fieldKey":"assignedPrisoner","label":"割り当てられそうな囚人","placeholder":"候補の囚人名","position":1,"body":"","updatedAt":"2026-08-28T00:57:46.870Z"},{"id":"default:chochokun07%40gmail.com:vermilion-cross:release:assignmentReason","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"vermilion-cross","sectionId":"release","fieldKey":"assignmentReason","label":"その囚人が選ばれる理由","placeholder":"武器、関係性、物語、モチーフなどの理由","position":2,"body":"","updatedAt":"2026-08-28T00:57:46.870Z"},{"id":"default:chochokun07%40gmail.com:vermilion-cross:release:timing","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"vermilion-cross","sectionId":"release","fieldKey":"timing","label":"実装時期","placeholder":"シーズン、イベント、実装順の予想","position":3,"body":"","updatedAt":"2026-08-28T00:57:46.870Z"},{"id":"default:chochokun07%40gmail.com:vermilion-cross:summary:oneLine","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"vermilion-cross","sectionId":"summary","fieldKey":"oneLine","label":"性能予想を一言で","placeholder":"動画の締めに使える短い表現","position":2,"body":"","updatedAt":"2026-08-28T00:57:46.870Z"},{"id":"default:chochokun07%40gmail.com:vermilion-cross:summary:position","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"vermilion-cross","sectionId":"summary","fieldKey":"position","label":"人格化した場合の立ち位置","placeholder":"ゲーム内で担う立ち位置を一文で","position":1,"body":"","updatedAt":"2026-08-28T00:57:46.870Z"},{"id":"default:chochokun07%40gmail.com:yellow-harpoon:combat:combatFeatures","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"yellow-harpoon","sectionId":"combat","fieldKey":"combatFeatures","label":"戦闘時の特徴","placeholder":"攻撃の流れ、得意な距離、目立つ挙動など","position":2,"body":"","updatedAt":"2026-08-28T00:57:47.998Z"},{"id":"default:chochokun07%40gmail.com:yellow-harpoon:combat:differences","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"yellow-harpoon","sectionId":"combat","fieldKey":"differences","label":"他の特色との差異","placeholder":"役割、戦い方、見せ場の違いなど","position":3,"body":"","updatedAt":"2026-08-28T00:57:47.998Z"},{"id":"default:chochokun07%40gmail.com:yellow-harpoon:combat:weaponsAbilities","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"yellow-harpoon","sectionId":"combat","fieldKey":"weaponsAbilities","label":"判明している武器・能力","placeholder":"武器、E.G.O、固有能力、演出から読み取れる要素など","position":1,"body":"","updatedAt":"2026-08-28T00:57:47.998Z"},{"id":"default:chochokun07%40gmail.com:yellow-harpoon:identity:aliasMeaning","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"yellow-harpoon","sectionId":"identity","fieldKey":"aliasMeaning","label":"異名の意味","placeholder":"異名の由来や、名前から受ける印象をメモ","position":1,"body":"","updatedAt":"2026-08-28T00:57:47.998Z"},{"id":"default:chochokun07%40gmail.com:yellow-harpoon:identity:whyChosen","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"yellow-harpoon","sectionId":"identity","fieldKey":"whyChosen","label":"特色に選ばれた理由","placeholder":"なぜこの人物が特色と呼ばれるのかをメモ","position":3,"body":"","updatedAt":"2026-08-28T00:57:47.998Z"},{"id":"default:chochokun07%40gmail.com:yellow-harpoon:identity:worldRole","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"yellow-harpoon","sectionId":"identity","fieldKey":"worldRole","label":"Project Moon作品内での立場","placeholder":"登場作品、所属、物語上の役割などをメモ","position":2,"body":"","updatedAt":"2026-08-28T00:57:47.998Z"},{"id":"default:chochokun07%40gmail.com:yellow-harpoon:operation:basicLoop","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"yellow-harpoon","sectionId":"operation","fieldKey":"basicLoop","label":"基本の立ち回り","placeholder":"普段どのスキルを振り、何を維持するか","position":1,"body":"","updatedAt":"2026-08-28T00:57:47.998Z"},{"id":"default:chochokun07%40gmail.com:yellow-harpoon:operation:burden","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"yellow-harpoon","sectionId":"operation","fieldKey":"burden","label":"運用上の負担","placeholder":"資源、速度、準備、編成制約などの注意点","position":5,"body":"","updatedAt":"2026-08-28T00:57:47.998Z"},{"id":"default:chochokun07%40gmail.com:yellow-harpoon:operation:goodTeams","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"yellow-harpoon","sectionId":"operation","fieldKey":"goodTeams","label":"相性のよい編成","placeholder":"所属、色、状態異常、資源などの相性","position":3,"body":"","updatedAt":"2026-08-28T00:57:47.998Z"},{"id":"default:chochokun07%40gmail.com:yellow-harpoon:operation:powerSpike","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"yellow-harpoon","sectionId":"operation","fieldKey":"powerSpike","label":"本領発揮までの流れ","placeholder":"準備から最大出力までの流れ、目安ターンなど","position":2,"body":"","updatedAt":"2026-08-28T00:57:47.998Z"},{"id":"default:chochokun07%40gmail.com:yellow-harpoon:operation:strengths","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"yellow-harpoon","sectionId":"operation","fieldKey":"strengths","label":"強み","placeholder":"この人格を採用する理由になる点","position":4,"body":"","updatedAt":"2026-08-28T00:57:47.998Z"},{"id":"default:chochokun07%40gmail.com:yellow-harpoon:performance:defense","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"yellow-harpoon","sectionId":"performance","fieldKey":"defense","label":"守備スキル","placeholder":"守備タイプ、効果、使う場面","position":5,"body":"","updatedAt":"2026-08-28T00:57:47.998Z"},{"id":"default:chochokun07%40gmail.com:yellow-harpoon:performance:passive","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"yellow-harpoon","sectionId":"performance","fieldKey":"passive","label":"パッシブ","placeholder":"発動条件、効果、必要な資源や状態","position":6,"body":"","updatedAt":"2026-08-28T00:57:47.998Z"},{"id":"default:chochokun07%40gmail.com:yellow-harpoon:performance:skill1","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"yellow-harpoon","sectionId":"performance","fieldKey":"skill1","label":"スキル1","placeholder":"スキル名、属性、コイン、効果、担当する役割","position":2,"body":"","updatedAt":"2026-08-28T00:57:47.998Z"},{"id":"default:chochokun07%40gmail.com:yellow-harpoon:performance:skill2","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"yellow-harpoon","sectionId":"performance","fieldKey":"skill2","label":"スキル2","placeholder":"スキル名、属性、コイン、効果、担当する役割","position":3,"body":"","updatedAt":"2026-08-28T00:57:47.998Z"},{"id":"default:chochokun07%40gmail.com:yellow-harpoon:performance:skill3","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"yellow-harpoon","sectionId":"performance","fieldKey":"skill3","label":"スキル3","placeholder":"スキル名、属性、コイン、効果、担当する役割","position":4,"body":"","updatedAt":"2026-08-28T00:57:47.998Z"},{"id":"default:chochokun07%40gmail.com:yellow-harpoon:performance:spec","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"yellow-harpoon","sectionId":"performance","fieldKey":"spec","label":"基礎スペック","placeholder":"体力／速度／混乱区間／防御レベル","position":1,"body":"","updatedAt":"2026-08-28T00:57:47.998Z"},{"id":"default:chochokun07%40gmail.com:yellow-harpoon:performance:supportPassive","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"yellow-harpoon","sectionId":"performance","fieldKey":"supportPassive","label":"サポートパッシブ","placeholder":"控えから与える効果と、相性のよい編成","position":7,"body":"","updatedAt":"2026-08-28T00:57:47.998Z"},{"id":"default:chochokun07%40gmail.com:yellow-harpoon:release:assignedPrisoner","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"yellow-harpoon","sectionId":"release","fieldKey":"assignedPrisoner","label":"割り当てられそうな囚人","placeholder":"候補の囚人名","position":1,"body":"","updatedAt":"2026-08-28T00:57:47.998Z"},{"id":"default:chochokun07%40gmail.com:yellow-harpoon:release:assignmentReason","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"yellow-harpoon","sectionId":"release","fieldKey":"assignmentReason","label":"その囚人が選ばれる理由","placeholder":"武器、関係性、物語、モチーフなどの理由","position":2,"body":"","updatedAt":"2026-08-28T00:57:47.998Z"},{"id":"default:chochokun07%40gmail.com:yellow-harpoon:release:timing","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"yellow-harpoon","sectionId":"release","fieldKey":"timing","label":"実装時期","placeholder":"シーズン、イベント、実装順の予想","position":3,"body":"","updatedAt":"2026-08-28T00:57:47.998Z"},{"id":"default:chochokun07%40gmail.com:yellow-harpoon:summary:oneLine","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"yellow-harpoon","sectionId":"summary","fieldKey":"oneLine","label":"性能予想を一言で","placeholder":"動画の締めに使える短い表現","position":2,"body":"","updatedAt":"2026-08-28T00:57:47.998Z"},{"id":"default:chochokun07%40gmail.com:yellow-harpoon:summary:position","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"yellow-harpoon","sectionId":"summary","fieldKey":"position","label":"人格化した場合の立ち位置","placeholder":"ゲーム内で担う立ち位置を一文で","position":1,"body":"","updatedAt":"2026-08-28T00:57:47.998Z"},{"id":"e95f566c-15e0-462d-81ee-4cc2be9db950","projectId":"7e4a9ec1-6df4-4c35-b1f8-1e0ec52b4d61","targetId":"red-mist","sectionId":"performance","fieldKey":null,"label":"専用能力","placeholder":"自由項目のメモ","position":11,"body":"【赤い霧】基礎値１、最大値５。数値１につき、全スキルの最終威力＋１、ダメージ量＋20％、（数値）だけ、最終コインから破壊不能コインに変更される","updatedAt":"2026-08-28T02:30:40.969Z"}]}  const TARGETS = [
    { id: "black-silence", label: "Black Silence" },
    { id: "blue-echo", label: "Blue Reverberation" },
    { id: "indigo-elder", label: "Indigo Elder" },
    { id: "purple-tears", label: "Purple Tear" },
    { id: "red-gaze", label: "Red Gaze" },
    { id: "red-mist", label: "Red Mist" },
    { id: "vermilion-cross", label: "Vermilion Cross" },
    { id: "yellow-harpoon", label: "Yellow Harpoon" },
  ];
  const SECTIONS = [
    { id: "identity", label: "人格設定" },
    { id: "release", label: "実装予想" },
    { id: "summary", label: "要約" },
    { id: "performance", label: "性能" },
    { id: "operation", label: "運用" },
    { id: "combat", label: "戦闘" },
  ];
  const FIELDS = {
    identity: [
      ["aliasMeaning", "異名の意味", "異名の由来や、名前から受ける印象をメモ"],
      ["worldRole", "Project Moon作品内での立場", "登場作品、所属、物語上の役割などをメモ"],
      ["whyChosen", "特色に選ばれた理由", "なぜこの人物が特色と呼ばれるのかをメモ"],
    ],
    release: [
      ["assignedPrisoner", "割り当てられそうな囚人", "候補の囚人名"],
      ["assignmentReason", "その囚人が選ばれる理由", "武器、関係性、物語、モチーフなどの理由"],
      ["timing", "実装時期", "シーズン、イベント、実装順の予想"],
    ],
    summary: [
      ["position", "人格化した場合の立ち位置", "ゲーム内で担う立ち位置を一文で"],
      ["oneLine", "性能予想を一言で", "動画の締めに使える短い表現"],
    ],
    performance: [
      ["spec", "基礎スペック", "体力／速度／混乱区間／防御レベル"],
      ["skill1", "スキル1", "スキル名、属性、コイン、効果、担当する役割"],
      ["skill2", "スキル2", "スキル名、属性、コイン、効果、担当する役割"],
      ["skill3", "スキル3", "スキル名、属性、コイン、効果、担当する役割"],
      ["defense", "守備スキル", "守備タイプ、効果、使う場面"],
      ["passive", "パッシブ", "発動条件、効果、必要な資源や状態"],
      ["supportPassive", "サポートパッシブ", "控えから与える効果と、相性のよい編成"],
    ],
    operation: [
      ["basicLoop", "基本の立ち回り", "普段どのスキルを振り、何を維持するか"],
      ["powerSpike", "本領発揮までの流れ", "準備から最大出力までの流れ、目安ターンなど"],
      ["goodTeams", "相性のよい編成", "所属、色、状態異常、資源などの相性"],
      ["strengths", "強み", "この人格を採用する理由になる点"],
      ["burden", "運用上の負担", "資源、速度、準備、編成制約などの注意点"],
    ],
    combat: [
      ["weaponsAbilities", "判明している武器・能力", "武器、E.G.O、固有能力、演出から読み取れる要素など"],
      ["combatFeatures", "戦闘時の特徴", "攻撃の流れ、得意な距離、目立つ挙動など"],
      ["differences", "他の特色との差異", "役割、戦い方、見せ場の違いなど"],
    ],
  };
  const state = {
    storage: "local",
    remoteError: "",
    user: null,
    projects: [],
    chapters: [],
    lines: [],
    speakers: [],
    concepts: [],
    identityItems: [],
    selectedProjectId: localStorage.getItem(LOCAL_KEYS.selectedProject) || "",
    selectedChapterId: "",
    selectedTargetId: "red-mist",
    selectedSectionId: "identity",
    activeTab: "concept",
    lastUserId: null,
    initialized: false,
  };

  const $ = (id) => document.getElementById(id);
  const page = () => $("hobbyPage");
  const createId = () => window.crypto?.randomUUID ? window.crypto.randomUUID() : "hobby-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  const now = () => new Date().toISOString();
  const isLocalMode = () => localStorage.getItem("my-application.local-mode") === "true";
  const escapeHtml = (value) => {
    const element = document.createElement("div");
    element.textContent = String(value ?? "");
    return element.innerHTML;
  };
  const targetLabel = (id) => TARGETS.find((target) => target.id === id)?.label || id;
  const sectionLabel = (id) => SECTIONS.find((section) => section.id === id)?.label || id;
  const fieldDefinition = (sectionId, fieldKey) => (FIELDS[sectionId] || []).find((field) => field[0] === fieldKey) || null;

  function notify(message, error) {
    const toast = $("toast");
    if (!toast) return;
    window.clearTimeout(notify.timer);
    toast.textContent = message;
    toast.classList.toggle("is-error", Boolean(error));
    toast.classList.add("is-visible");
    notify.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2800);
  }

  function setNotice(message) {
    const notice = $("hobbyDataNotice");
    const text = $("hobbyDataNoticeText");
    if (!notice || !text) return;
    text.textContent = message || "";
    notice.hidden = !message;
  }

  function normalizeProject(row) {
    return {
      id: row.id || createId(),
      name: String(row.name || "新しいプロジェクト").trim(),
      conceptType: row.concept_type || row.conceptType || "generic",
      outputTemplate: row.output_template || row.outputTemplate || "{speaker}「{body}」",
      charsPerMinute: Number(row.chars_per_minute || row.charsPerMinute || 300),
      createdAt: row.created_at || row.createdAt || now(),
      updatedAt: row.updated_at || row.updatedAt || now(),
    };
  }

  function normalizeChapter(row) {
    return {
      id: row.id || createId(),
      projectId: row.project_id || row.projectId,
      position: Number(row.position || 1),
      name: String(row.name || "チャプター").trim(),
      createdAt: row.created_at || row.createdAt || now(),
      updatedAt: row.updated_at || row.updatedAt || now(),
    };
  }

  function normalizeLine(row) {
    return {
      id: row.id || createId(),
      chapterId: row.chapter_id || row.chapterId,
      position: Number(row.position || 1),
      speaker: String(row.speaker || ""),
      body: String(row.body || ""),
      createdAt: row.created_at || row.createdAt || now(),
      updatedAt: row.updated_at || row.updatedAt || now(),
    };
  }

  function normalizeSpeaker(row) {
    return {
      id: row.id || createId(),
      name: String(row.name || "").trim(),
      position: Number(row.position || 1),
      createdAt: row.created_at || row.createdAt || now(),
      updatedAt: row.updated_at || row.updatedAt || now(),
    };
  }

  function normalizeConcept(row) {
    return {
      projectId: row.project_id || row.projectId,
      conceptType: row.concept_type || row.conceptType || "generic",
      toolKey: row.tool_key || row.toolKey || "",
      body: String(row.body || ""),
      updatedAt: row.updated_at || row.updatedAt || now(),
    };
  }

  function normalizeIdentityItem(row) {
    return {
      id: row.id || createId(),
      projectId: row.project_id || row.projectId || IDENTITY_PROJECT_ID,
      targetId: row.target_id || row.targetId || "red-mist",
      sectionId: row.section_id || row.sectionId || "performance",
      fieldKey: row.field_key ?? row.fieldKey ?? null,
      label: String(row.label || "自由項目"),
      placeholder: String(row.placeholder || "自由項目のメモ"),
      position: Number(row.position || 1),
      body: String(row.body || ""),
      updatedAt: row.updated_at || row.updatedAt || now(),
    };
  }

  function readCollection(key, normalizer) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value.map(normalizer) : [];
    } catch (error) {
      console.warn("趣味データの読み込みに失敗しました", error);
      return [];
    }
  }

  function writeLocal() {
    localStorage.setItem(LOCAL_KEYS.projects, JSON.stringify(state.projects));
    localStorage.setItem(LOCAL_KEYS.chapters, JSON.stringify(state.chapters));
    localStorage.setItem(LOCAL_KEYS.lines, JSON.stringify(state.lines));
    localStorage.setItem(LOCAL_KEYS.speakers, JSON.stringify(state.speakers));
    localStorage.setItem(LOCAL_KEYS.concepts, JSON.stringify(state.concepts));
    localStorage.setItem(LOCAL_KEYS.identity, JSON.stringify(state.identityItems));
    if (state.selectedProjectId) localStorage.setItem(LOCAL_KEYS.selectedProject, state.selectedProjectId);
  }

  function specialProject() {
    return normalizeProject({
      id: IDENTITY_PROJECT_ID,
      name: "特色人格予想プロジェクト",
      conceptType: "identity_prediction",
      outputTemplate: "{speaker}「{body}」",
      charsPerMinute: 300,
    });
  }

  function seedLocalState() {
    const projectIds = new Set(state.projects.map((project) => project.id));
    LEGACY_SEED.projects.forEach((project) => {
      if (!projectIds.has(project.id)) state.projects.push(normalizeProject(project));
    });
    LEGACY_SEED.chapters.forEach((chapter) => {
      if (!state.chapters.some((item) => item.id === chapter.id)) state.chapters.push(normalizeChapter(chapter));
    });
    LEGACY_SEED.lines.forEach((line) => {
      if (!state.lines.some((item) => item.id === line.id)) state.lines.push(normalizeLine(line));
    });
    LEGACY_SEED.speakers.forEach((speaker) => {
      if (!state.speakers.some((item) => item.id === speaker.id)) state.speakers.push(normalizeSpeaker(speaker));
    });
    if (!state.projects.some((project) => project.id === IDENTITY_PROJECT_ID)) state.projects.push(specialProject());
    LEGACY_SEED.notes.forEach((note) => {
      if (note.projectId && !state.concepts.some((concept) => concept.projectId === note.projectId)) {
        state.concepts.push(normalizeConcept({ projectId: note.projectId, body: note.body }));
      }
    });
    LEGACY_SEED.identityItems.forEach((item) => {
      if (!state.identityItems.some((current) => current.id === item.id)) {
        state.identityItems.push(normalizeIdentityItem({
          id: item.id,
          projectId: IDENTITY_PROJECT_ID,
          targetId: item.targetId,
          sectionId: item.sectionId,
          fieldKey: item.fieldKey,
          label: item.label,
          placeholder: item.placeholder,
          position: item.position,
          body: item.body,
        }));
      }
    });
    if (!state.selectedProjectId || !state.projects.some((project) => project.id === state.selectedProjectId)) {
      state.selectedProjectId = state.projects[0]?.id || "";
    }
    if (state.selectedProjectId) {
      const firstChapter = state.chapters.filter((chapter) => chapter.projectId === state.selectedProjectId).sort((a, b) => a.position - b.position)[0];
      state.selectedChapterId = firstChapter?.id || "";
    }
    writeLocal();
  }

  function getProject() {
    return state.projects.find((project) => project.id === state.selectedProjectId) || null;
  }

  function getConcept(projectId) {
    return state.concepts.find((concept) => concept.projectId === projectId) || null;
  }

  function getChapters(projectId) {
    return state.chapters.filter((chapter) => chapter.projectId === projectId).sort((a, b) => a.position - b.position);
  }

  function getLines(chapterId) {
    return state.lines.filter((line) => line.chapterId === chapterId).sort((a, b) => a.position - b.position);
  }

  function getIdentityItems(targetId, sectionId) {
    return state.identityItems
      .filter((item) => item.projectId === (getProject()?.id || IDENTITY_PROJECT_ID) && item.targetId === targetId && item.sectionId === sectionId)
      .sort((a, b) => a.position - b.position);
  }

  function identityItemId(targetId, sectionId, fieldKey) {
    return "identity:" + (getProject()?.id || IDENTITY_PROJECT_ID) + ":" + targetId + ":" + sectionId + ":" + fieldKey;
  }

  function findIdentityField(targetId, sectionId, fieldKey) {
    return state.identityItems.find((item) => item.projectId === IDENTITY_PROJECT_ID
      && item.targetId === targetId && item.sectionId === sectionId && item.fieldKey === fieldKey) || null;
  }

  function findCustomIdentityItem(id) {
    return state.identityItems.find((item) => item.id === id) || null;
  }

  function isRemote() {
    return state.storage === "remote" && Boolean(remoteClient && state.user);
  }

  async function fetchRemoteData() {
    const requests = await Promise.all([
      remoteClient.from(TABLES.projects).select("*").order("updated_at", { ascending: false }),
      remoteClient.from(TABLES.chapters).select("*").order("position", { ascending: true }),
      remoteClient.from(TABLES.lines).select("*").order("position", { ascending: true }),
      remoteClient.from(TABLES.speakers).select("*").order("position", { ascending: true }),
      remoteClient.from(TABLES.concepts).select("*"),
      remoteClient.from(TABLES.identity).select("*").order("position", { ascending: true }),
    ]);
    const error = requests.find((result) => result.error)?.error;
    if (error) throw error;
    state.projects = (requests[0].data || []).map(normalizeProject);
    state.chapters = (requests[1].data || []).map(normalizeChapter);
    state.lines = (requests[2].data || []).map(normalizeLine);
    state.speakers = (requests[3].data || []).map(normalizeSpeaker);
    state.concepts = (requests[4].data || []).map(normalizeConcept);
    state.identityItems = (requests[5].data || []).map(normalizeIdentityItem);
  }

  async function upsertRows(table, rows, conflict) {
    if (!rows.length) return;
    const result = await remoteClient.from(table).upsert(rows, { onConflict: conflict || "id" });
    if (result.error) throw result.error;
  }

  async function seedRemoteState() {
    const projectIds = new Set(state.projects.map((project) => project.id));
    const missingProjects = LEGACY_SEED.projects
      .filter((project) => !projectIds.has(project.id))
      .map((project) => ({
        id: project.id,
        user_id: state.user.id,
        name: project.name,
        concept_type: "generic",
        output_template: project.outputTemplate,
        chars_per_minute: project.charsPerMinute,
      }));
    const missingChapters = LEGACY_SEED.chapters
      .filter((chapter) => !state.chapters.some((item) => item.id === chapter.id))
      .map((chapter) => ({ id: chapter.id, user_id: state.user.id, project_id: chapter.projectId, position: chapter.position, name: chapter.name }));
    const missingLines = LEGACY_SEED.lines
      .filter((line) => !state.lines.some((item) => item.id === line.id))
      .map((line) => ({ id: line.id, user_id: state.user.id, chapter_id: line.chapterId, position: line.position, speaker: line.speaker, body: line.body }));
    const missingSpeakers = LEGACY_SEED.speakers
      .filter((speaker) => !state.speakers.some((item) => item.id === speaker.id))
      .map((speaker) => ({ id: speaker.id, user_id: state.user.id, name: speaker.name, position: speaker.position }));
    const missingConcepts = LEGACY_SEED.notes
      .filter((note) => note.projectId && !state.concepts.some((concept) => concept.projectId === note.projectId))
      .map((note) => ({ project_id: note.projectId, user_id: state.user.id, concept_type: "generic", body: note.body }));
    const rows = [
      ...missingProjects,
      {
        id: IDENTITY_PROJECT_ID,
        user_id: state.user.id,
        name: "特色人格予想プロジェクト",
        concept_type: "identity_prediction",
        output_template: "{speaker}「{body}」",
        chars_per_minute: 300,
      },
    ];
    await upsertRows(TABLES.projects, rows, "id");
    await upsertRows(TABLES.chapters, missingChapters, "id");
    await upsertRows(TABLES.lines, missingLines, "id");
    await upsertRows(TABLES.speakers, missingSpeakers, "id");
    await upsertRows(TABLES.concepts, missingConcepts, "project_id");
    if (!state.identityItems.length) {
      const identityRows = LEGACY_SEED.identityItems.map((item) => ({
        id: item.id,
        user_id: state.user.id,
        project_id: IDENTITY_PROJECT_ID,
        target_id: item.targetId,
        section_id: item.sectionId,
        field_key: item.fieldKey,
        label: item.label,
        placeholder: item.placeholder,
        position: item.position,
        body: item.body,
      }));
      await upsertRows(TABLES.identity, identityRows, "id");
    }
    await fetchRemoteData();
  }

  async function loadLocal() {
    state.storage = "local";
    state.remoteError = "";
    state.projects = readCollection(LOCAL_KEYS.projects, normalizeProject);
    state.chapters = readCollection(LOCAL_KEYS.chapters, normalizeChapter);
    state.lines = readCollection(LOCAL_KEYS.lines, normalizeLine);
    state.speakers = readCollection(LOCAL_KEYS.speakers, normalizeSpeaker);
    state.concepts = readCollection(LOCAL_KEYS.concepts, normalizeConcept);
    state.identityItems = readCollection(LOCAL_KEYS.identity, normalizeIdentityItem);
    seedLocalState();
    render();
  }

  async function loadRemote() {
    state.storage = "remote";
    state.remoteError = "";
    try {
      await fetchRemoteData();
      if (!state.projects.length || !state.projects.some((project) => project.id === IDENTITY_PROJECT_ID)) {
        await seedRemoteState();
      }
      if (!state.selectedProjectId || !state.projects.some((project) => project.id === state.selectedProjectId)) {
        state.selectedProjectId = state.projects[0]?.id || "";
      }
      const firstChapter = getChapters(state.selectedProjectId)[0];
      if (!state.selectedChapterId || !getChapters(state.selectedProjectId).some((chapter) => chapter.id === state.selectedChapterId)) {
        state.selectedChapterId = firstChapter?.id || "";
      }
      localStorage.setItem(LOCAL_KEYS.selectedProject, state.selectedProjectId || "");
      setNotice("");
      render();
    } catch (error) {
      state.remoteError = "構想・台本の同期には、最新のsupabase/schema.sqlを実行してください。現在はこの端末に保存します。";
      await loadLocal();
      setNotice(state.remoteError);
    }
  }

  async function saveProject(project) {
    project.updatedAt = now();
    if (isRemote()) {
      const result = await remoteClient.from(TABLES.projects).upsert({
        id: project.id,
        user_id: state.user.id,
        name: project.name,
        concept_type: project.conceptType,
        output_template: project.outputTemplate,
        chars_per_minute: project.charsPerMinute,
        updated_at: project.updatedAt,
      }, { onConflict: "id" }).select("*").single();
      if (result.error) throw result.error;
      const index = state.projects.findIndex((item) => item.id === project.id);
      if (index >= 0) state.projects[index] = normalizeProject(result.data);
      else state.projects.unshift(normalizeProject(result.data));
    } else {
      writeLocal();
    }
    render();
  }

  async function saveConcept(concept) {
    concept.updatedAt = now();
    const index = state.concepts.findIndex((item) => item.projectId === concept.projectId);
    if (index >= 0) state.concepts[index] = concept;
    else state.concepts.push(concept);
    if (isRemote()) {
      const result = await remoteClient.from(TABLES.concepts).upsert({
        project_id: concept.projectId,
        user_id: state.user.id,
        concept_type: concept.conceptType,
        tool_key: concept.toolKey || null,
        body: concept.body || null,
        updated_at: concept.updatedAt,
      }, { onConflict: "project_id" });
      if (result.error) throw result.error;
    } else writeLocal();
    render();
  }

  async function saveIdentityItem(item) {
    item.updatedAt = now();
    const index = state.identityItems.findIndex((current) => current.id === item.id);
    if (index >= 0) state.identityItems[index] = item;
    else state.identityItems.push(item);
    if (isRemote()) {
      const result = await remoteClient.from(TABLES.identity).upsert({
        id: item.id,
        user_id: state.user.id,
        project_id: IDENTITY_PROJECT_ID,
        target_id: item.targetId,
        section_id: item.sectionId,
        field_key: item.fieldKey,
        label: item.label,
        placeholder: item.placeholder,
        position: item.position,
        body: item.body,
        updated_at: item.updatedAt,
      }, { onConflict: "id" });
      if (result.error) throw result.error;
    } else writeLocal();
  }

  async function saveChapter(chapter) {
    chapter.updatedAt = now();
    const index = state.chapters.findIndex((item) => item.id === chapter.id);
    if (index >= 0) state.chapters[index] = chapter;
    else state.chapters.push(chapter);
    if (isRemote()) {
      const result = await remoteClient.from(TABLES.chapters).upsert({
        id: chapter.id,
        user_id: state.user.id,
        project_id: chapter.projectId,
        position: chapter.position,
        name: chapter.name,
        updated_at: chapter.updatedAt,
      }, { onConflict: "id" });
      if (result.error) throw result.error;
    } else writeLocal();
    render();
  }

  async function saveLine(line, rerender) {
    line.updatedAt = now();
    const index = state.lines.findIndex((item) => item.id === line.id);
    if (index >= 0) state.lines[index] = line;
    else state.lines.push(line);
    if (isRemote()) {
      const result = await remoteClient.from(TABLES.lines).upsert({
        id: line.id,
        user_id: state.user.id,
        chapter_id: line.chapterId,
        position: line.position,
        speaker: line.speaker,
        body: line.body,
        updated_at: line.updatedAt,
      }, { onConflict: "id" });
      if (result.error) throw result.error;
    } else writeLocal();
    if (rerender) render();
  }

  async function saveSpeaker(speaker) {
    speaker.updatedAt = now();
    const index = state.speakers.findIndex((item) => item.id === speaker.id);
    if (index >= 0) state.speakers[index] = speaker;
    else state.speakers.push(speaker);
    if (isRemote()) {
      const result = await remoteClient.from(TABLES.speakers).upsert({
        id: speaker.id,
        user_id: state.user.id,
        name: speaker.name,
        position: speaker.position,
        updated_at: speaker.updatedAt,
      }, { onConflict: "id" });
      if (result.error) throw result.error;
    } else writeLocal();
    render();
  }

  async function removeProject(project) {
    if (!window.confirm("「" + project.name + "」を削除しますか？")) return;
    if (isRemote()) {
      const result = await remoteClient.from(TABLES.projects).delete().eq("id", project.id);
      if (result.error) throw result.error;
    }
    state.projects = state.projects.filter((item) => item.id !== project.id);
    const chapterIds = new Set(state.chapters.filter((chapter) => chapter.projectId === project.id).map((chapter) => chapter.id));
    state.chapters = state.chapters.filter((chapter) => chapter.projectId !== project.id);
    state.lines = state.lines.filter((line) => !chapterIds.has(line.chapterId));
    state.concepts = state.concepts.filter((concept) => concept.projectId !== project.id);
    if (project.id === IDENTITY_PROJECT_ID) state.identityItems = [];
    if (!state.projects.length) seedLocalState();
    state.selectedProjectId = state.projects[0]?.id || "";
    state.selectedChapterId = getChapters(state.selectedProjectId)[0]?.id || "";
    writeLocal();
    render();
  }

  function renderProjectList() {
    const container = $("hobbyProjectList");
    if (!container) return;
    const projects = [...state.projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    container.innerHTML = projects.map((project) =>
      "<button class="hobby-project-card" + (project.id === state.selectedProjectId ? " is-active" : "") + "" type="button" data-hobby-action="select-project" data-project-id="" + escapeHtml(project.id) + "">"
      + "<span class="hobby-project-card-name">" + escapeHtml(project.name) + "</span>"
      + "<span class="hobby-project-card-meta">" + (project.conceptType === "identity_prediction" ? "特色人格構想" : "動画プロジェクト") + "</span>"
      + "</button>"
    ).join("");
    $("hobbyProjectEmpty").hidden = projects.length !== 0;
  }

  function renderConcept() {
    const project = getProject();
    const identity = project?.conceptType === "identity_prediction";
    const generic = $("hobbyGenericConcept");
    const identityPanel = $("hobbyIdentityConcept");
    generic.hidden = identity || !project;
    identityPanel.hidden = !identity || !project;
    if (!project) return;
    $("hobbyConceptProjectLabel").textContent = project.name;
    $("hobbyIdentityProjectLabel").textContent = project.name;
    const concept = getConcept(project.id) || normalizeConcept({ projectId: project.id, conceptType: project.conceptType });
    $("hobbyConceptBody").value = concept.body || "";
    $("hobbyIdentityTarget").innerHTML = TARGETS.map((target) =>
      "<option value="" + escapeHtml(target.id) + """ + (target.id === state.selectedTargetId ? " selected" : "") + ">" + escapeHtml(target.label) + "</option>"
    ).join("");
    $("hobbyIdentitySectionTabs").innerHTML = SECTIONS.map((section) =>
      "<button class="hobby-section-tab" + (section.id === state.selectedSectionId ? " is-active" : "") + "" type="button" data-hobby-section="" + section.id + "">" + escapeHtml(section.label) + "</button>"
    ).join("");
    const definitions = FIELDS[state.selectedSectionId] || [];
    const items = getIdentityItems(state.selectedTargetId, state.selectedSectionId);
    const customItems = items.filter((item) => !item.fieldKey);
    const fieldsHtml = definitions.map((field, index) => {
      const item = findIdentityField(state.selectedTargetId, state.selectedSectionId, field[0]);
      return "<label class="hobby-identity-field">"
        + "<span>" + escapeHtml(field[1]) + "</span>"
        + "<textarea rows="4" data-identity-field="1" data-field-key="" + escapeHtml(field[0]) + "" data-field-label="" + escapeHtml(field[1]) + "" data-field-placeholder="" + escapeHtml(field[2]) + "" placeholder="" + escapeHtml(field[2]) + "">" + escapeHtml(item?.body || "") + "</textarea>"
        + "</label>";
    }).join("");
    const customHtml = customItems.map((item) =>
      "<label class="hobby-identity-field hobby-custom-field">"
      + "<span>" + escapeHtml(item.label) + " <button class="hobby-inline-danger" type="button" data-identity-action="remove-custom" data-item-id="" + escapeHtml(item.id) + "">削除</button></span>"
      + "<textarea rows="4" data-identity-field="1" data-item-id="" + escapeHtml(item.id) + "" placeholder="" + escapeHtml(item.placeholder) + "">" + escapeHtml(item.body) + "</textarea>"
      + "</label>"
    ).join("");
    $("hobbyIdentityFields").innerHTML = fieldsHtml + customHtml;
  }

  function renderScript() {
    const project = getProject();
    const chapters = getChapters(project?.id);
    if (!project) return;
    if (!state.selectedChapterId || !chapters.some((chapter) => chapter.id === state.selectedChapterId)) {
      state.selectedChapterId = chapters[0]?.id || "";
    }
    $("hobbyChapterList").innerHTML = chapters.map((chapter) =>
      "<button class="hobby-chapter-button" + (chapter.id === state.selectedChapterId ? " is-active" : "") + "" type="button" data-hobby-action="select-chapter" data-chapter-id="" + escapeHtml(chapter.id) + "">"
      + escapeHtml(chapter.name) + "</button>"
    ).join("");
    $("hobbyChapterEmpty").hidden = chapters.length !== 0;
    const chapter = chapters.find((item) => item.id === state.selectedChapterId);
    $("hobbyCurrentChapterName").textContent = chapter?.name || "チャプター未選択";
    const lines = getLines(chapter?.id);
    const speakerOptions = state.speakers
      .sort((a, b) => a.position - b.position)
      .map((speaker) => "<option value="" + escapeHtml(speaker.name) + "">" + escapeHtml(speaker.name) + "</option>")
      .join("");
    $("hobbyLineList").innerHTML = lines.map((line, index) =>
      "<article class="hobby-dialogue-line" data-line-id="" + escapeHtml(line.id) + "">"
      + "<div class="hobby-line-toolbar"><span class="hobby-line-number">" + (index + 1) + "</span>"
      + "<select data-script-action="speaker">" + (line.speaker && !state.speakers.some((speaker) => speaker.name === line.speaker) ? "<option value="" + escapeHtml(line.speaker) + "" selected>" + escapeHtml(line.speaker) + "</option>" : "") + speakerOptions.replace("value="" + escapeHtml(line.speaker) + """, "value="" + escapeHtml(line.speaker) + "" selected") + "</select>"
      + "<button type="button" data-script-action="up" aria-label="上へ">↑</button><button type="button" data-script-action="down" aria-label="下へ">↓</button><button type="button" data-script-action="delete" aria-label="削除">削除</button></div>"
      + "<textarea rows="3" data-script-action="body" placeholder="セリフ本文">" + escapeHtml(line.body) + "</textarea>"
      + "</article>"
    ).join("");
    $("hobbyLineEmpty").hidden = lines.length !== 0;
    const allText = state.lines.filter((line) => getChapters(project.id).some((chapterItem) => chapterItem.id === line.chapterId)).map((line) => line.body).join("");
    const characters = allText.length;
    $("hobbyScriptStats").textContent = characters + "文字 / 約" + Math.max(0, Math.ceil(characters / Math.max(1, project.charsPerMinute))) + "分";
    $("hobbyOutputTemplate").value = project.outputTemplate;
    $("hobbyCharsPerMinute").value = String(project.charsPerMinute);
    $("hobbySpeakerList").innerHTML = state.speakers.sort((a, b) => a.position - b.position).map((speaker) => "<li>" + escapeHtml(speaker.name) + "</li>").join("");
  }

  function renderWorkspace() {
    const project = getProject();
    $("hobbyWorkspace").hidden = !project;
    $("hobbyProjectActions").hidden = !project;
    if (!project) return;
    $("hobbyProjectTitle").textContent = project.name;
    $("hobbyProjectType").textContent = project.conceptType === "identity_prediction" ? "特色人格予想プロジェクト" : "動画プロジェクト";
    $("hobbyIdentityModeButton").hidden = project.conceptType === "identity_prediction";
    document.querySelectorAll("[data-hobby-tab]").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.hobbyTab === state.activeTab));
    $("hobbyConceptPane").hidden = state.activeTab !== "concept";
    $("hobbyScriptPane").hidden = state.activeTab !== "script";
    renderConcept();
    renderScript();
  }

  function render() {
    if (!page()) return;
    renderProjectList();
    renderWorkspace();
  }

  async function createProject() {
    const name = window.prompt("動画プロジェクト名を入力してください。", "新しい動画プロジェクト");
    if (!name?.trim()) return;
    const project = normalizeProject({
      id: createId(),
      name: name.trim(),
      conceptType: name.includes("特色人格") ? "identity_prediction" : "generic",
      outputTemplate: "{speaker}「{body}」",
      charsPerMinute: 300,
    });
    state.projects.unshift(project);
    state.selectedProjectId = project.id;
    state.selectedChapterId = "";
    state.concepts.push(normalizeConcept({ projectId: project.id, conceptType: project.conceptType, toolKey: project.conceptType === "identity_prediction" ? "colored-fixer-notes" : "" }));
    if (project.conceptType === "identity_prediction") {
      LEGACY_SEED.identityItems.forEach((item) => state.identityItems.push(normalizeIdentityItem({ ...item, id: createId(), projectId: project.id })));
    }
    try {
      await saveProject(project);
      await saveConcept(getConcept(project.id));
      notify("プロジェクトを作成しました");
    } catch (error) {
      notify("プロジェクトの保存に失敗しました: " + error.message, true);
    }
  }

  async function editProject() {
    const project = getProject();
    if (!project) return;
    const name = window.prompt("プロジェクト名を変更してください。", project.name);
    if (!name?.trim() || name.trim() === project.name) return;
    project.name = name.trim();
    await saveProject(project);
    notify("プロジェクト名を変更しました");
  }

  async function makeIdentityProject() {
    const project = getProject();
    if (!project) return;
    project.conceptType = "identity_prediction";
    let concept = getConcept(project.id);
    if (!concept) {
      concept = normalizeConcept({ projectId: project.id, conceptType: "identity_prediction", toolKey: "colored-fixer-notes" });
      state.concepts.push(concept);
    } else {
      concept.conceptType = "identity_prediction";
      concept.toolKey = "colored-fixer-notes";
    }
    await saveProject(project);
    await saveConcept(concept);
    notify("特色人格構想ページを紐付けました");
  }

  async function editConcept() {
    const project = getProject();
    if (!project) return;
    const concept = getConcept(project.id) || normalizeConcept({ projectId: project.id, conceptType: project.conceptType });
    concept.body = $("hobbyConceptBody").value;
    await saveConcept(concept);
    notify("構想を保存しました");
  }

  async function addChapter() {
    const project = getProject();
    if (!project) return;
    const name = window.prompt("チャプター名を入力してください。", "チャプター" + (getChapters(project.id).length + 1));
    if (!name?.trim()) return;
    const chapter = normalizeChapter({ id: createId(), projectId: project.id, name: name.trim(), position: getChapters(project.id).length + 1 });
    try {
      await saveChapter(chapter);
      state.selectedChapterId = chapter.id;
      render();
      notify("チャプターを追加しました");
    } catch (error) {
      notify("チャプターの保存に失敗しました: " + error.message, true);
    }
  }

  async function editChapter() {
    const chapter = state.chapters.find((item) => item.id === state.selectedChapterId);
    if (!chapter) return;
    const name = window.prompt("チャプター名を変更してください。", chapter.name);
    if (!name?.trim() || name.trim() === chapter.name) return;
    chapter.name = name.trim();
    await saveChapter(chapter);
    notify("チャプター名を変更しました");
  }

  async function deleteChapter() {
    const chapter = state.chapters.find((item) => item.id === state.selectedChapterId);
    if (!chapter || !window.confirm("「" + chapter.name + "」を削除しますか？")) return;
    if (isRemote()) {
      const result = await remoteClient.from(TABLES.chapters).delete().eq("id", chapter.id);
      if (result.error) throw result.error;
    }
    state.chapters = state.chapters.filter((item) => item.id !== chapter.id);
    state.lines = state.lines.filter((line) => line.chapterId !== chapter.id);
    state.selectedChapterId = getChapters(getProject()?.id)[0]?.id || "";
    writeLocal();
    render();
  }

  async function addLine() {
    const chapter = state.chapters.find((item) => item.id === state.selectedChapterId);
    if (!chapter) {
      notify("先にチャプターを追加してください", true);
      return;
    }
    const line = normalizeLine({
      id: createId(),
      chapterId: chapter.id,
      position: getLines(chapter.id).length + 1,
      speaker: state.speakers[0]?.name || "",
      body: "",
    });
    try {
      await saveLine(line, true);
      window.setTimeout(() => document.querySelector("[data-line-id="" + line.id + ""] textarea")?.focus(), 30);
    } catch (error) {
      notify("セリフの保存に失敗しました: " + error.message, true);
    }
  }

  async function addSpeaker() {
    const name = $("hobbySpeakerInput").value.trim();
    if (!name) return;
    if (state.speakers.some((speaker) => speaker.name === name)) {
      $("hobbySpeakerInput").value = "";
      return;
    }
    const speaker = normalizeSpeaker({ id: createId(), name, position: state.speakers.length + 1 });
    $("hobbySpeakerInput").value = "";
    await saveSpeaker(speaker);
    notify("話者を追加しました");
  }

  async function moveLine(lineId, direction) {
    const line = state.lines.find((item) => item.id === lineId);
    if (!line) return;
    const lines = getLines(line.chapterId);
    const index = lines.findIndex((item) => item.id === lineId);
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= lines.length) return;
    const other = lines[nextIndex];
    const currentPosition = line.position;
    line.position = other.position;
    other.position = currentPosition;
    if (isRemote()) {
      const result = await remoteClient.from(TABLES.lines).upsert([
        { id: line.id, user_id: state.user.id, chapter_id: line.chapterId, position: line.position, speaker: line.speaker, body: line.body },
        { id: other.id, user_id: state.user.id, chapter_id: other.chapterId, position: other.position, speaker: other.speaker, body: other.body },
      ], { onConflict: "id" });
      if (result.error) throw result.error;
    }
    writeLocal();
    render();
  }

  async function removeLine(lineId) {
    const line = state.lines.find((item) => item.id === lineId);
    if (!line || !window.confirm("このセリフを削除しますか？")) return;
    if (isRemote()) {
      const result = await remoteClient.from(TABLES.lines).delete().eq("id", lineId);
      if (result.error) throw result.error;
    }
    state.lines = state.lines.filter((item) => item.id !== lineId);
    writeLocal();
    render();
  }

  async function saveIdentityField(element) {
    const project = getProject();
    if (!project || project.conceptType !== "identity_prediction") return;
    const targetId = state.selectedTargetId;
    const sectionId = state.selectedSectionId;
    const customId = element.dataset.itemId;
    const fieldKey = element.dataset.fieldKey || null;
    const definition = fieldKey ? fieldDefinition(sectionId, fieldKey) : null;
    const existing = customId ? findCustomIdentityItem(customId) : findIdentityField(targetId, sectionId, fieldKey);
    const item = existing || normalizeIdentityItem({
      id: customId || identityItemId(targetId, sectionId, fieldKey),
      projectId: project.id,
      targetId,
      sectionId,
      fieldKey,
      label: definition?.[1] || element.dataset.fieldLabel || "自由項目",
      placeholder: definition?.[2] || element.dataset.fieldPlaceholder || "自由項目のメモ",
      position: definition ? (FIELDS[sectionId] || []).findIndex((field) => field[0] === fieldKey) + 1 : getIdentityItems(targetId, sectionId).length + 1,
      body: "",
    });
    item.body = element.value;
    try {
      await saveIdentityItem(item);
      notify("構想を保存しました");
    } catch (error) {
      notify("構想の保存に失敗しました: " + error.message, true);
    }
  }

  async function addCustomField() {
    const label = window.prompt("追加する項目名を入力してください。", "自由項目");
    if (!label?.trim()) return;
    const item = normalizeIdentityItem({
      id: createId(),
      projectId: getProject()?.id || IDENTITY_PROJECT_ID,
      targetId: state.selectedTargetId,
      sectionId: state.selectedSectionId,
      fieldKey: null,
      label: label.trim(),
      placeholder: "自由項目のメモ",
      position: getIdentityItems(state.selectedTargetId, state.selectedSectionId).length + 1,
      body: "",
    });
    await saveIdentityItem(item);
    render();
    notify("自由項目を追加しました");
  }

  async function removeCustomField(itemId) {
    const item = findCustomIdentityItem(itemId);
    if (!item || !window.confirm("この自由項目を削除しますか？")) return;
    if (isRemote()) {
      const result = await remoteClient.from(TABLES.identity).delete().eq("id", item.id);
      if (result.error) throw result.error;
    }
    state.identityItems = state.identityItems.filter((current) => current.id !== item.id);
    writeLocal();
    render();
  }

  function exportScript() {
    const project = getProject();
    if (!project) return;
    const rows = [];
    getChapters(project.id).forEach((chapter) => {
      rows.push("【" + chapter.name + "】");
      getLines(chapter.id).forEach((line) => {
        rows.push(project.outputTemplate.replaceAll("{speaker}", line.speaker || "").replaceAll("{body}", line.body || ""));
      });
      rows.push("");
    });
    const blob = new Blob([rows.join("
")], { type: "text/plain;charset=utf-8" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = project.name.replace(/[\/:*?"<>|]/g, "_") + ".txt";
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  function handleClick(event) {
    const tab = event.target.closest("[data-hobby-tab]");
    if (tab) {
      state.activeTab = tab.dataset.hobbyTab;
      renderWorkspace();
      return;
    }
    const section = event.target.closest("[data-hobby-section]");
    if (section) {
      state.selectedSectionId = section.dataset.hobbySection;
      renderConcept();
      return;
    }
    const identityAction = event.target.closest("[data-identity-action]");
    if (identityAction?.dataset.identityAction === "remove-custom") {
      removeCustomField(identityAction.dataset.itemId).catch((error) => notify(error.message, true));
      return;
    }
    const target = event.target.closest("[data-hobby-action]");
    if (!target) return;
    const action = target.dataset.hobbyAction;
    if (action === "select-project") {
      state.selectedProjectId = target.dataset.projectId;
      state.selectedChapterId = getChapters(state.selectedProjectId)[0]?.id || "";
      localStorage.setItem(LOCAL_KEYS.selectedProject, state.selectedProjectId);
      render();
    } else if (action === "add-project") {
      createProject();
    } else if (action === "edit-project") {
      editProject().catch((error) => notify(error.message, true));
    } else if (action === "delete-project") {
      removeProject(getProject()).catch((error) => notify(error.message, true));
    } else if (action === "make-identity") {
      makeIdentityProject().catch((error) => notify(error.message, true));
    } else if (action === "add-chapter") {
      addChapter();
    } else if (action === "edit-chapter") {
      editChapter().catch((error) => notify(error.message, true));
    } else if (action === "delete-chapter") {
      deleteChapter().catch((error) => notify(error.message, true));
    } else if (action === "select-chapter") {
      state.selectedChapterId = target.dataset.chapterId;
      renderScript();
    } else if (action === "add-line") {
      addLine();
    } else if (action === "add-speaker") {
      addSpeaker();
    } else if (action === "move-up" || action === "move-down") {
      moveLine(target.closest("[data-line-id]")?.dataset.lineId, action === "move-up" ? "up" : "down").catch((error) => notify(error.message, true));
    } else if (action === "delete-line") {
      removeLine(target.closest("[data-line-id]")?.dataset.lineId).catch((error) => notify(error.message, true));
    } else if (action === "add-custom") {
      addCustomField().catch((error) => notify(error.message, true));
    } else if (action === "save-concept") {
      editConcept().catch((error) => notify(error.message, true));
    } else if (action === "export-script") {
      exportScript();
    }
  }

  function handleChange(event) {
    const target = event.target;
    if (target.id === "hobbyIdentityTarget") {
      state.selectedTargetId = target.value;
      renderConcept();
      return;
    }
    if (target.id === "hobbyOutputTemplate" || target.id === "hobbyCharsPerMinute") {
      const project = getProject();
      if (!project) return;
      if (target.id === "hobbyOutputTemplate") project.outputTemplate = target.value || "{speaker}「{body}」";
      else project.charsPerMinute = Math.max(1, Number(target.value) || 300);
      saveProject(project).catch((error) => notify(error.message, true));
      return;
    }
    if (target.dataset.scriptAction === "speaker") {
      const line = state.lines.find((item) => item.id === target.closest("[data-line-id]")?.dataset.lineId);
      if (!line) return;
      line.speaker = target.value;
      saveLine(line, false).catch((error) => notify(error.message, true));
    }
  }

  function handleBlur(event) {
    const target = event.target;
    if (target.dataset.identityField === "1") {
      saveIdentityField(target);
      return;
    }
    if (target.dataset.scriptAction === "body") {
      const line = state.lines.find((item) => item.id === target.closest("[data-line-id]")?.dataset.lineId);
      if (!line) return;
      line.body = target.value;
      saveLine(line, false).catch((error) => notify(error.message, true));
    }
  }

  function bindEvents() {
    const root = page();
    if (!root) return;
    root.addEventListener("click", handleClick);
    root.addEventListener("change", handleChange);
    root.addEventListener("blur", handleBlur, true);
    const observer = new MutationObserver(() => {
      if (root.hidden) return;
      render();
    });
    observer.observe(root, { attributes: true, attributeFilter: ["hidden"] });
    window.addEventListener("hashchange", () => {
      if (window.location.hash.replace("#", "").toLowerCase() === "hobby") render();
    });
    $("hobbyProjectList")?.addEventListener("dblclick", (event) => {
      const target = event.target.closest("[data-project-id]");
      if (target) editProject().catch((error) => notify(error.message, true));
    });
  }

  async function syncSession(session) {
    const user = session?.user || null;
    if (!user || isLocalMode() || !remoteClient) {
      if (state.storage !== "local") await loadLocal();
      return;
    }
    if (state.lastUserId === user.id && state.storage === "remote") return;
    state.user = user;
    state.lastUserId = user.id;
    await loadRemote();
  }

  async function init() {
    bindEvents();
    if (remoteClient && !isLocalMode()) {
      remoteClient.auth.onAuthStateChange((_event, session) => {
        window.setTimeout(() => syncSession(session).catch((error) => notify(error.message, true)), 0);
      });
      const result = await remoteClient.auth.getSession();
      await syncSession(result.data?.session);
    } else {
      await loadLocal();
    }
    state.initialized = true;
  }

  document.addEventListener("DOMContentLoaded", init);
})();
