import { Router } from 'express';
import {
  listCustomers,
  getCustomer,
  getCustomerByCpf,
  getCustomerByPhone,
  registerCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  listCondominiums,
  getCustomerStats,
} from '../controllers/customerController.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

// Rotas públicas (para identificação no autoatendimento)
router.get('/cpf/:cpf', getCustomerByCpf);
router.get('/phone/:phone', getCustomerByPhone);
router.post('/register', registerCustomer);

// Rotas protegidas (admin da loja)
router.get('/', authMiddleware, listCustomers);
router.get('/condominiums', authMiddleware, listCondominiums);
router.get('/stats', authMiddleware, getCustomerStats);
router.get('/:id', authMiddleware, getCustomer);
router.post('/', authMiddleware, createCustomer);
router.put('/:id', authMiddleware, updateCustomer);
router.delete('/:id', authMiddleware, deleteCustomer);

export { router as customerRoutes };
