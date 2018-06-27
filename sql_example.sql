SELECT * FROM singers
JOIN songs
ON songs.singer_id = singers.id
JOIN albums
ON album.singer_id = singers.id
WHERE singers.id>11;


****

when someone logs in

SELECT * FROM users WHERE email = $1;






-- do this... query.. then we know when they
-- log in if they've signed the petition or not

SELECT first, last, email, password, users.id, signature AS sig_id
FROM users
LEFT JOIN signatures
ON signatures.user_id = users.id
WHERE email = $1;
