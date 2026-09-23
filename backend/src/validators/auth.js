import { body } from 'express-validator';

const nameRule = body('name').trim().isLength({ min: 2, max: 80 }).withMessage('El nombre debe tener entre 2 y 80 caracteres').matches(/^[\p{L} ]+$/u).withMessage('El nombre solo puede contener letras y espacios');
const passwordRule = body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres').matches(/[A-Za-z]/).withMessage('La contraseña debe contener una letra').matches(/\d/).withMessage('La contraseña debe contener un número');

const registerRules = [nameRule, body('email').trim().isEmail().withMessage('Email inválido').normalizeEmail(), passwordRule, body('passwordConfirmation').custom((value, { req }) => value === req.body.password).withMessage('Las contraseñas no coinciden'), body('role').optional().isIn(['consumidor', 'vendedor']).withMessage('Rol inválido')];
const loginRules = [body('email').trim().isEmail().withMessage('Email inválido').normalizeEmail(), body('password').notEmpty().withMessage('La contraseña es obligatoria')];

export { registerRules, loginRules };
