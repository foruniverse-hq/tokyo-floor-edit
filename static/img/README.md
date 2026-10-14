# 写真の置き場(Higgsfield で生成後に置く。無い間は生成ポスター/グラデーションで代替される)

| ファイル | 比率 | 使う場所 |
|---|---|---|
| hero.jpg | 16:9 | トップのヒーロー(Canvas の下地。reduced-motion 時はこれが見える) |
| label-music.jpg / label-party.jpg / label-mixed.jpg | 3:2 | 評価の決め方のラベルカード、トップのラベル説明のチップ |
| area-shibuya.jpg / area-shinjuku.jpg / area-roppongi.jpg / area-aoyama.jpg / area-nakameguro.jpg / area-west.jpg | 21:9 | 箱一覧のエリア見出し(west = 下北沢・中野・高円寺・幡ヶ谷・その他) |

同名の `.webp` を並べて置くと `<picture>` で先に出す。寸法は site.py がファイルから読む(width/height 属性に入る)。
