export const handler = async (event) => {
  await fetch("https://api.example.com/subscribe", {
    method: "POST",
    body: JSON.stringify({
      query: "",
      variables: {},
    }),
  });
};
