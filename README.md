## Pipe functions
A pipe function is not a new concept for people familiar with functional programming. The concept of pipe is simple - **it combines n functions**. Each function push information downwards transforming  into a desired format. It’s a pipe flowing **left-to-right**, calling each function **with the output of the last one**.

```typescript
const double = (num) => num * 2;
const add1 = (num) => num + 1;

pipe(add1, double)(5) // equivalent double(add1(5));
// returns 12
```
Pipe functions give ability to create **small** and **reusable peaces** of code **combining together** in multiple variations.

The idea of pipe function is pretty simple to understand and to implement in JavaScript. However, there is an interesting challenge around building such a functionality when working with promises and asynchronous data fetching. An even bigger challenge is fit functionality to `getServerSideProps`.

Let's implement such a function in **TypeScript**.

## Pipe implementation

_ssrHelpers.ts_
```typescript
import { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';

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

    // it means we have notFound or redirect.
    // We need to break our pipe and return this result immediately.
    if (!('props' in res)) {
      break;
    }
  }

  return res;
};
```

There are **4 important aspects** to understand in this small code snippet:

- By using the spread operator, we can accept an **unlimited** number of **piped functions**.
- Each function **receives** `input` as an **argument** the resolved value of the **previous Promise**.
- If result execution of piped functions does not have `props` property
```typescript
export type GetServerSidePropsResult<P> =
  | { props: P | Promise<P> }
  | { redirect: Redirect }
  | { notFound: true }
```
it means we have `notFound` or `redirect`. So we need to break our pipe and return this result immediately.
- We end up **returning** the **data** in the format Next.js is expecting in getServerSideProps - `GetServerSidePropsResult`.

## Pipe example usage

```typescript
export const getServerSideProps: GetServerSideProps = ssrHelpers.pipe(
  ssrPipes.withAuth(),
  ssrPipes.withSubscription(),
);
```

The first function will then receive as an argument the Next.js context. It can then proceed to fetch the user session and information based the context object and send along the information to the next function in line:

```typescript
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
```

The next function passed will then receive the previous function's return value as an argument. It can then proceed to fetch new information and format it to be passed down the chain. In our example, this is our last function, so we will return an object representing the value of our Page's props:

```typescript
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
```

An unlimited number of functions can then work together to achieve a pipeline of information. The last function is responsible to return the final Props object. This object will then be injected as a prop to the next.js Page component:

```typescript
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

export const getServerSideProps: GetServerSideProps = ssrHelpers.pipe(
  ssrPipes.withAuth(),
  ssrPipes.withSubscription(),
);
```

## Parallel execution implementation
`pipe` helper call  piped function one after the other sequentially. This may be inefficient if we want to piped several functions that make a request to the server.
We can run this functions in parallel by writing our own helpers inspired by `Promise.all`.

_ssrHelpers.ts_
```typescript
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
```

To better understand this code snipped let's remember how works `Promise.all`. It rejects immediately upon any of the input promises rejecting or non-promises throwing an error, and will reject with this first rejection message / error.
Similar to `Promise.all` `pipesExecParallel` take functions and run its with Promise.all under the hood. If one of functions return notFound or redirect it's consider and rejection / error and return this result immediate. Otherwise all functions results merged and pass down to next function in pipe.

## Parallel execution example usage
```typescript
export const getServerSideProps: GetServerSideProps = ssrHelpers.pipe(
  ssrPipes.withAuth(), // 500ms
  // run two async piped function parallel to minimize fetching data time
  ssrHelpers.pipesExecParallel( // 500ms in parallel execution
    ssrPipes.withSubscription(), // 500ms
    ssrPipes.withAlbums(), // 500ms
  ),
);
// total 1000ms
```

## Conclusion
Pipe functions great fits into functional programming react paradigm and helps:
- organize data fetching, validations in getServerSideProps in the one style
- combine small methods with single responsibility in complex getServerSideProps call with `pipe` helper
- share reusable pipes across pages(withAuth, withUser, withSubscription)
- run pipes in parallel with helper `pipesExecParallel`

## Inspired by
- https://www.frontend-devops.com/blog/pipe-serverside-props-in-nextjs
