import Bot from '../client/Client';

export default interface Handler<T> {
  (client: Bot, args: T): Promise<void>;
}
