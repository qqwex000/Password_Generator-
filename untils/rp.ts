function randompass(passwordLength: number, passwordCount: number, n: number, ss: number) {
  const specialSymbols = ['"', '#', '$', '%', '&', "'", '(', ')', '*', '+', ',', '-', '.', '/', ':', ';', '<', '=', '>', '?', '@', '[', '\\', ']', '^', '_', '`', '{', '|', '}', '~'];
  const numberSymbols = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');

  let allowed = [...letters];

  if (n === 1) allowed.push(...numberSymbols);
  if (ss === 1) allowed.push(...specialSymbols);

  const list_password = [];

  for (let j: number = 0; j < passwordCount; j++) {
    let password = '';
    for (let i: number = 0; i < passwordLength; i++) {
      const randomIndex = Math.floor(Math.random() * allowed.length);
      password += allowed[randomIndex];
    }
    list_password.push(password);
  }  
  console.log(list_password);
  console.log('Start random_password.js');
  return list_password;
}

export default randompass;