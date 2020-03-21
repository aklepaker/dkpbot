import * as http from 'http';
import * as Prometheus from 'prom-client';

export class Metrics {
    private port: any;


    constructor() {
        //
    }
    public async Init(): Promise<void> {
        const collectDefaultMetrics = Prometheus.collectDefaultMetrics;
        collectDefaultMetrics();

        this.port = process.env.METRIC_PORT || 3300;
        const server = http.createServer((req, res) => {
            if (req.url === '/metrics') {
                const register = Prometheus.register;
                res.setHeader('Connection', 'close');
                res.setHeader('Content-Type', register.contentType);
                res.write(register.metrics());
                res.end();
            }
            res.statusCode = 404;
            res.statusMessage = 'Not found';
            res.end();
        })
        server.listen(this.port, process.env.METRIC_IP)
        console.info(`Prometheus listening on ${this.port}/metrics`);
    }
    public GuildGauge = new Prometheus.Gauge({
        name: 'guild_gauge',
        help: 'Number of servers the bot has joined',
    });

    public MessagesSentCounter = new Prometheus.Counter({
        name: 'messages_sent',
        help: 'Messages the bot has sent',
        labelNames: ['server'],
    });

    public MessagesReceivedCounter = new Prometheus.Counter({
        name: 'messages_received',
        help: 'Messages the bot has received',
        labelNames: ['server'],
    });

}