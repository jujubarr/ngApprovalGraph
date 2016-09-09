import { ApprovalGraphRendererPage } from './app.po';

describe('approval-graph-renderer App', function() {
  let page: ApprovalGraphRendererPage;

  beforeEach(() => {
    page = new ApprovalGraphRendererPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
