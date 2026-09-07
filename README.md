# My application v0.1

個人の活動を一か所から扱うための、To Do機能の初期版です。GitHub Pagesで公開できる静的PWAとして構成しています。

## できること

- タスクの追加・編集・削除
- チェック操作による完了・未完了の切り替え
- 状態、期限、優先度、メモの管理
- 今日／すべて／完了の表示切り替え
- タスク検索
- スマートフォンへのPWAインストール
- 通知日時を保存できるデータ構造

## 同期設定

同期を使わない場合は、設定なしでこの端末のローカル保存を利用できます。

PC・スマートフォン間で同期する場合は、次の手順を行ってください。

1. Supabaseで無料プロジェクトを作成する。
2. SupabaseのSQL Editorで `supabase/schema.sql` の内容を実行する。
3. SupabaseのProject Settings → APIから、Project URLとanon（またはpublishable）keyを確認する。
4. `config.js` の `SUPABASE_URL` と `SUPABASE_ANON_KEY` に入力する。
5. GitHubのリポジトリへファイルをpushする。
6. GitHubのSettings → Pagesで、公開元を `main` ブランチのルートに設定する。

`config.js`には公開用キーだけを入れてください。`service_role` keyは絶対に入れないでください。タスクの保護はSupabaseのRow Level Securityで行います。

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
app.js                  To Doと認証・同期の処理
config.js               Supabase接続設定
manifest.webmanifest    PWA設定
sw.js                   オフライン用キャッシュ
supabase/schema.sql     DBとRLSの定義
```
