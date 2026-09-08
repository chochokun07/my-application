# My application v0.1

個人の活動を一か所から扱うための、To Do・研究管理機能の初期版です。GitHub Pagesで公開できる静的PWAとして構成しています。

## できること

- タスクの追加・編集・削除
- チェック操作による完了・未完了の切り替え
- 状態、期限、優先度、メモの管理
- 今日／すべて／完了の表示切り替え
- タスク検索
- タグ候補からのタグ選択
- 活動ページ名タグによるページ別タスク表示
- スマートフォン・PC共通のサイドバーナビゲーション
- スマートフォンへのPWAインストール
- 通知日時を保存できるデータ構造
- 研究ページでの予定・研究プラン・研究タスクの管理
- ページ名と同じタグを付けたタスクを、各活動ページとメインTo Doで共通管理


- 趣味ページで動画プロジェクトを管理
- プロジェクトごとの構想ページと台本ページ
- 台本ページでのチャプター・セリフ・話者・書き出し管理
- 特色人格予想プロジェクトの構想ページに、特色人格構想ノートの項目を移行


## 同期設定

同期を使わない場合は、設定なしでこの端末のローカル保存を利用できます。

PC・スマートフォン間で同期する場合は、次の手順を行ってください。

1. Supabaseで無料プロジェクトを作成する。
2. SupabaseのSQL Editorで、最新の `supabase/schema.sql` の内容を実行する。
3. SupabaseのProject Settings → APIから、Project URLとanon（またはpublishable）keyを確認する。
4. `config.js` の `SUPABASE_URL` と `SUPABASE_ANON_KEY` に入力する。
5. GitHubのリポジトリへファイルをpushする。
6. GitHubのSettings → Pagesで、公開元を `main` ブランチのルートに設定する。

`config.js`には公開用キーだけを入れてください。`service_role` keyは絶対に入れないでください。タスク・研究プラン・研究予定の保護はSupabaseのRow Level Securityで行います。

研究ページを同期利用する場合は、既存の `tasks` テーブルに研究連携用の列を追加し、`research_plans` と `research_schedules` テーブルを作成する必要があります。今回追加したSQLを実行すると、既存タスクを維持したまま反映できます。

タスクは、タグと活動ページ名が一致すると、その活動ページのタスク欄に表示されます。タグ候補はアプリ設定から追加・削除でき、活動ページ名は自動的に候補へ反映されます。

GitHub FreeでGitHub Pagesを使う場合、リポジトリは公開設定が必要です。タスク本文はGitHubではなく、Supabaseに保存されます。

## ローカル確認

ブラウザで `index.html` を直接開いても基本機能は確認できます。PWAや一部ブラウザ機能まで確認する場合は、プロジェクトフォルダーで次を実行してください。

```bash
python3 -m http.server 8080
```

その後、 `http://localhost:8080` を開きます。

## 構造

```text
index.html              画面構造
styles.css              レスポンシブUI
app.js                  To Do・研究管理と認証・同期の処理
config.js               Supabase接続設定
manifest.webmanifest    PWA設定
sw.js                   オフライン用キャッシュ
supabase/schema.sql     DBとRLSの定義
```
