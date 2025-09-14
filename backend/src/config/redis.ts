import Redis from 'ioredis';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
};

export const redis = new Redis(redisConfig);

redis.on('connect', () => {
  console.log('Redis connected successfully');
});

redis.on('error', (error) => {
  console.error('Redis connection error:', error);
});

export const initializeRedis = async (): Promise<void> => {
  try {
    await redis.ping();
    console.log('Redis connection established successfully');
  } catch (error) {
    console.error('Error connecting to Redis:', error);
    throw error;
  }
};
