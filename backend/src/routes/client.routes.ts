import { type Request, type Response, Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import * as clientService from '../services/client.service';
import type { CreateClientInput } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all clients
router.get('/', async (req: Request, res: Response) => {
  try {
    const clients = await clientService.getAllClients(req.user?.userId);

    res.json({
      success: true,
      data: clients,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Get client by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid client ID' });
      return;
    }

    const client = await clientService.getClientById(id);

    if (!client) {
      res.status(404).json({ success: false, error: 'Client not found' });
      return;
    }

    res.json({ success: true, data: client });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Create new client
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const input: CreateClientInput = req.body;

    if (!input.first_name || !input.last_name) {
      res.status(400).json({
        success: false,
        error: 'First name and last name are required',
      });
      return;
    }

    const client = await clientService.createClient(input, req.user.userId);

    res.status(201).json({
      success: true,
      data: client,
      message: 'Client created successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Update client
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid client ID' });
      return;
    }

    const input: Partial<CreateClientInput> = req.body;
    const client = await clientService.updateClient(id, input);

    if (!client) {
      res.status(404).json({ success: false, error: 'Client not found' });
      return;
    }

    res.json({
      success: true,
      data: client,
      message: 'Client updated successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Delete client
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid client ID' });
      return;
    }

    const deleted = await clientService.deleteClient(id);

    if (!deleted) {
      res.status(404).json({ success: false, error: 'Client not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Client deleted successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
