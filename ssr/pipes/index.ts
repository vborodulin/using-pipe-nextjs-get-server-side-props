import {TPipeGetServerSideProps} from '../helpers';
import {delay} from 'helpers/delay';
import {TAlbum, TSubscription, TUser} from 'types';

const fetchUser = async () => {
  // emulate async request
  await delay(500);

  // emulate not auth user response
  if (Math.random() > 0.5) {
    const user: TUser = {
      id: 1,
      username: 'myUser',
      age: 18,
    };

    return user;
  }

  return null;
}

const fetchSubscription = async (userId: number) => {
  // emulate async request
  await delay(500);

  const subscription: TSubscription = {
    id: 1,
    userId,
  };

  return subscription;
}

const fetchAlbums = async (userId: number) => {
  // emulate async request
  await delay(500);

  const albums: TAlbum[] = [
    {
      id: 1,
      name: 'Album 1',
      userId,
    },
    {
      id: 2,
      name: 'Album 2',
      userId,
    }
  ];

  return albums;
}

// we can pass arg as options to piped function
const withAuth = (): TPipeGetServerSideProps => async (
  context, input
) => {
  const user = await fetchUser();

  // if !user -> not auth
  // return notFound and break piped functions chain
  if (!user) {
    return {
      notFound: true
    }
  }

  // merge props and pass down to the next function
  return {
    props: {
      ...input.props,
      user,
    }
  }
};

// we can pass arg as options to piped function
const withSubscription = (): TPipeGetServerSideProps => async (
  context, input
) => {
  const { user } = input.props as { user: TUser;}
  const subscription = await fetchSubscription(user.id);

  // subscription can be empty
  // merge props and pass down to the next function
  return {
    props: {
      ...input.props,
      subscription,
    }
  }
};

const withAlbums = (): TPipeGetServerSideProps => async (
  context, input
) => {
  const { user } = input.props as { user: TUser;}
  const albums = await fetchAlbums(user.id);

  // merge props and pass down to the next function
  return {
    props: {
      ...input.props,
      albums,
    }
  }
};

const ssrPipes = {
  withAuth,
  withSubscription,
  withAlbums,
};

export {
  ssrPipes
}
