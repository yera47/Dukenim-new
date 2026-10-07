export type StoryApproach="collection"|"assortment"|"guided";

export function mobileApproachForTemplate(templateKey:string|null|undefined):StoryApproach{
  if(templateKey==="market")return "assortment";
  if(templateKey==="studio"||templateKey==="signature")return "guided";
  return "collection";
}
