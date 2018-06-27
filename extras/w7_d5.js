SELECT users.id, first, last, email, age, city, url, signature.id AS hassigned FROM users LEFT JOIN user_profiles ON users.id = user_profiles.user_id LEFT JOIN signatures ON users.id=signatures.user_id WHERE users.email = 'david@F'


SELECT users.id, first, last, email, age, city, url, signature.id AS hassigned
FROM users
LEFT JOIN user_profiles
ON users.id = user_profiles.user_id
LEFT JOIN signatures
ON users.id=signatures.user_id 
WHERE users.email = 'david@F' ;


SELECT users.id, first, last, email, age, city, url, signatures.id

FROM users LEFT JOIN user_profiles ON users.id = user_profiles.user_id
LEFT JOIN signatures
ON users.id=signatures.user_id
WHERE users.email = 'david@F' ;
