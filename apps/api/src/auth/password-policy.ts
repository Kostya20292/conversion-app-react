const PASSWORD_MIN_LENGTH = 8;

const hasLetter = (value: string): boolean => /\p{L}/u.test(value);
const hasDigit = (value: string): boolean => /\d/.test(value);

export const isPasswordValid = (password: string): boolean => {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return false;
  }

  return hasLetter(password) && hasDigit(password);
};
