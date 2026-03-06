# Markdown Vault

マークダウンファイルの閲覧・タグ付け・絞り込みができるWebアプリです。

## セットアップ手順

### 1. Node.js をインストール

https://nodejs.org/ にアクセスして **LTS版** をダウンロード・インストールしてください。
インストール後、ターミナル（Windowsならコマンドプロンプト or PowerShell）で確認：

```
node -v
npm -v
```

バージョン番号が表示されればOKです。

### 2. プロジェクトの依存パッケージをインストール

このフォルダ内でターミナルを開き：

```
npm install
```

### 3. ローカルで動作確認

```
npm run dev
```

ブラウザで `http://localhost:5173` を開いて動作確認できます。

### 4. GitHub にリポジトリを作成 & プッシュ

```
git init
git add .
git commit -m "初回コミット"
git branch -M main
git remote add origin https://github.com/あなたのユーザー名/md-vault.git
git push -u origin main
```

### 5. Cloudflare Pages にデプロイ

1. https://dash.cloudflare.com/ にログイン
2. 左メニューから「Workers & Pages」→「Create」をクリック
3. 「Pages」タブ →「Connect to Git」をクリック
4. GitHub アカウントを連携してリポジトリ `md-vault` を選択
5. ビルド設定：
   - **フレームワークプリセット**: なし
   - **ビルドコマンド**: `npm run build`
   - **ビルド出力ディレクトリ**: `dist`
6. 「Save and Deploy」をクリック

数分でデプロイされ、`https://md-vault-xxx.pages.dev` のようなURLが発行されます。

### 6. アクセス制限を設定（オプション）

URLを知っている人だけに公開したい場合：

1. Cloudflareダッシュボードで「Zero Trust」→「Access」→「Applications」
2. 「Add an application」→「Self-hosted」
3. ドメインに Pages のURLを設定
4. ポリシーで「メールアドレスのOTP認証」を設定

これで許可したメールアドレスの人だけがアクセスできるようになります。
