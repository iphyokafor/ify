type Failure<S extends number> = {
  ok: false;
  status: S;
  error: string;
};

export const failure = <S extends number>(status: S, error: string): Failure<S> => ({
  ok: false,
  status,
  error,
});
