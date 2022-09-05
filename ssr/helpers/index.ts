import {GetServerSidePropsContext, GetServerSidePropsResult} from 'next';

export type TPipeGetServerSideProps = (
  context: GetServerSidePropsContext,
  input: { props: Promise<any> | any }
) => Promise<GetServerSidePropsResult<any>> | GetServerSidePropsResult<any>;

const pipe = (...fns: TPipeGetServerSideProps[]) => async (
  context: GetServerSidePropsContext
) => {
  let res: GetServerSidePropsResult<any> = {
    props: {},
  };

  for await (const fn of fns) {
    res = await fn(context, res);

    if (!('props' in res)) {
      break;
    }
  }

  return res;
};

const pipesExecParallel = (...fns: TPipeGetServerSideProps[]): TPipeGetServerSideProps => async (
  context,
  input
) => {
  const promiseArr: (Promise<GetServerSidePropsResult<any>> | GetServerSidePropsResult<any>)[] = [];

  fns.forEach((fn) => {
    promiseArr.push(fn(context, input));
  });

  const promiseAllRes = await Promise.all(promiseArr);

  let notFoundRes: GetServerSidePropsResult<any> | null = null;
  let redirectRes: GetServerSidePropsResult<any> | null = null;
  const propsRes: GetServerSidePropsResult<any> = {
    props: {},
  };

  for (let i = 0; i < fns.length; i++) {
    const fnRes = promiseAllRes[i];

    if ('props' in fnRes) {
      propsRes.props = {
        ...propsRes.props,
        ...fnRes.props,
      };
    }

    if ('notFound' in fnRes && fnRes.notFound) {
      notFoundRes = {
        notFound: true,
      };
      break;
    }

    if ('redirect' in fnRes) {
      redirectRes = {
        redirect: fnRes.redirect,
      };
      break;
    }
  }

  if (notFoundRes) {
    return notFoundRes;
  }

  if (redirectRes) {
    return redirectRes;
  }

  return propsRes;
};

const ssrHelpers = {
  pipe,
  pipesExecParallel,
};

export {
  ssrHelpers
}
