<Page className="max-w-none p-0 min-h-screen bg-gradient-to-br from-sky-400 via-indigo-500 to-purple-600">
  <For collection="frames">
    <VStack className="w-full min-h-screen items-center justify-center gap-10 p-12">
      <Heading level={1} className="text-white text-4xl font-bold text-center">{item.caption}</Heading>
      <Image src={item.image} width={300} height={640} fit="contain" className="[filter:drop-shadow(0_30px_60px_rgba(0,0,0,0.5))]"/>
    </VStack>
  </For>
</Page>
