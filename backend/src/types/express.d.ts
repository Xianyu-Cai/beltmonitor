import { User } from 'src/services/user/user.entity';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
