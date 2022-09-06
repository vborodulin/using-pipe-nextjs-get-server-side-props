import {GetServerSideProps, NextPage} from 'next';
import {ssrHelpers} from 'ssr/helpers';
import {ssrPipes} from 'ssr/pipes';
import {TAlbum, TSubscription, TUser} from 'types';

export type TIndexPageProps = {
  user: TUser;
  subscription: TSubscription | null;
  albums: TAlbum[];
};

const IndexPage: NextPage<TIndexPageProps> = (props) => {
  const {
    user,
    subscription,
    albums,
  } = props;

  return (
    <main>
      <h1>Index Page</h1>
      <p>
        user: {JSON.stringify(user)}
      </p>
      <p>
        subscription: {JSON.stringify(subscription)}
      </p>
      <p>
        albums: {JSON.stringify(albums)}
      </p>
    </main>
  );
};

// Example with parallel piped functions execution
export const getServerSideProps: GetServerSideProps = ssrHelpers.pipe(
  ssrPipes.withAuth(), // 500ms
  // run two async piped function parallel to minimize fetching data time
  ssrHelpers.pipesExecParallel( // 500ms in parallel execution
    ssrPipes.withSubscription(), // 500ms
    ssrPipes.withAlbums(), // 500ms
  ),
);
// total 1000ms

// Example sequential execution
// export const getServerSideProps: GetServerSideProps = ssrHelpers.pipe(
//   ssrPipes.withAuth(), // 500ms delay
//   ssrPipes.withSubscription(), // 500ms delay
//   ssrPipes.withAlbums(), // 500ms delay
// );
// total 1500ms

export default IndexPage;
