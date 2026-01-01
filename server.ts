import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import next from 'next';
import { GameManager } from './src/lib/game/game-manager';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const port = 3000;

app.prepare().then(() => {
    const server = express();
    const httpServer = createServer(server);
    const io = new Server(httpServer);

    // Initialize Game Manager (does NOT auto-start training)
    const gameManager = new GameManager(io);
    // Training is controlled by the UI - no auto-start

    // Socket.io connection
    io.on('connection', (socket) => {
        console.log('Client connected', socket.id);

        // Send current state immediately on connection (Drop-in)
        socket.emit('game_state', gameManager.getCurrentState());

        socket.on('disconnect', () => {
            console.log('Client disconnected', socket.id);
        });
    });

    // Handle all other requests with Next.js
    server.all(/(.*)/, (req, res) => {
        return handle(req, res);
    });

    httpServer.listen(port, () => {
        console.log(`> Ready on http://localhost:${port}`);
        console.log(`> Neural Network Chess AI running...`);
    });
});
