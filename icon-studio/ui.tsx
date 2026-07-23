<Page className="p-0 max-w-none w-screen h-screen bg-transparent">
  <For collection="icon">
    <VStack className="relative w-screen h-screen items-center justify-center">
      <Image src={item.bg} fit="fill" className="absolute inset-0 w-screen h-screen"/>
      <Image src={item.glyph} width={300} height={300} fit="contain" className="relative [filter:drop-shadow(0_10px_22px_rgba(0,0,0,0.25))]"/>
    </VStack>
  </For>
</Page>
