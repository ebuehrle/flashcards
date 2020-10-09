import './App.css';

import React from 'react';
import { Box, Button, Card, CardBody, CardFooter, Footer, Grommet, Header, Heading, Layer, Markdown, Stack, Text, TextArea, TextInput } from 'grommet';
import { Checkmark, Edit, Radial, RadialSelected, Trash } from 'grommet-icons';

import { v4 as uuidv4 } from 'uuid';
import { fileOpen, fileSave } from 'browser-nativefs';
import filenamify from 'filenamify';

const theme = {
  global: {
    font: {
      family: 'Raleway',
    },
  },
};

class Flashcard extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      flipped: false,
    };
  }
  
  handleFlip() {
    this.setState({
      flipped: !this.state.flipped,
    });
  }

  render() {
    return (
      <div>
      <div className={'card-flip ' + (this.state.flipped ? 'flipped' : '')}>
        <div className="flip">
          <div className="front">
            <Card border={this.props.border} margin="small" background="light-1" width="medium" height={{ min: 'small' }}>
              <CardBody pad="medium" onClick={() => this.handleFlip()}>
                { this.props.editing ? <TextArea 
                    autoFocus={!this.state.flipped}
                    fill
                    resize="vertical"
                    value={this.props.front}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    onChange={(e) => this.props.onChangeFront(e)}
                  /> : this.props.front
                }
              </CardBody>
            </Card>
          </div>
          <div className="back">
            <Card border={this.props.border} margin="small" background="light-1" elevation="large" width="medium" height={{ min: 'small' }}>
              <CardBody pad="medium" onClick={() => this.handleFlip()}>
                { this.props.editing ? <TextArea 
                    autoFocus={this.state.flipped}
                    fill
                    resize="vertical"
                    value={this.props.back}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    onChange={(e) => this.props.onChangeBack(e)}
                  /> : this.props.back
                }
              </CardBody>
              {this.props.footer}
            </Card>
          </div>
        </div>
      </div>
      </div>
    );
  }

} 

class Toast extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      show: true,
      timeout: null,
    };
  }

  hide() {
    if (this.state.timeout !== null) {
      clearTimeout(this.state.timeout);
    }

    this.setState({
      show: false,
      timeout: null,
    });
  }

  componentDidMount() {
    if (this.state.timeout === null) {
      this.setState({
        timeout: setTimeout(() => this.hide(), 3000),
      });
    }
  }

  render() {
    return this.state.show && (
      <Layer position="bottom-left" margin="large" plain modal={false}>
        <Card direction="row" pad="medium" gap="large" align="baseline" background="dark-3" elevation="large">
          {this.props.text}
          <Box onClick={() => this.hide()}>
            {this.props.action}
          </Box>
        </Card>
      </Layer>
    );
  }
}

class App extends React.Component {

  constructor(props) {
    super(props);
    const cards = [
      {
        id: uuidv4(),
        front: "Hey!",
        back: "Nice to meet you!",
        editing: false,
        progress: {
          category: 'Hard',
        },
      },
      {
        id: uuidv4(),
        front: "This is a little flash cards app. Click cards to flip and edit them.",
        back: "Isn't that neat?",
        editing: false,
        progress: {
          category: 'Medium',
        },
      },
      {
        id: uuidv4(),
        front: "You can add #tags to cards. Tags will show up at the bottom of the screen.",
        back: "Also, you can track your progress using the three coloured dots below. Go ahead and add your first card!",
        editing: false,
        progress: {
          category: 'Easy',
        },
      },
    ];

    this.state = {
      boxTitle: "Cards",
      cards: cards,
      notifications: [],
      selectedCategories: new Set([
        'Easy', 'Medium', 'Hard',
      ]),
      selectedTags: new Set([
        'Untagged', '#tags',
      ]),
    };
  }

  getSaveState() {
    return ({
      boxTitle: this.state.boxTitle,
      cards: this.state.cards,
      selectedCategories: [...this.state.selectedCategories],
      selectedTags: [...this.state.selectedTags],
    });
  }

  handleSave() {
    fileSave(new Blob([JSON.stringify(this.getSaveState())], {type: 'application/json'}), {
      fileName: filenamify(this.state.boxTitle, {replacement: '-'}) + '.json',
      extensions: ['.json'],
    });
  }

  async handleOpen() {
    const blob = await fileOpen({
      mimeTypes: ['application/json'],
    });

    if (blob === null) {
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('loadend', () => {
      const result = JSON.parse(reader.result);
      this.setState({
        boxTitle: result.boxTitle,
        cards: result.cards,
        selectedCategories: new Set(result.selectedCategories),
        selectedTags: new Set(result.selectedTags),
      });
    });
    reader.readAsText(blob);
  }

  getTags() {
    let tagsMap = {
      'Untagged': [],
    };

    for (const card of this.state.cards) {
      const tagRE = /#[^#\s!?.,:]+/g;
      const cardFrontTags = card.front.match(tagRE);
      const cardBackTags = card.back.match(tagRE);
      const cardTags = (cardFrontTags !== null ? cardFrontTags : []).concat(cardBackTags !== null ? cardBackTags : []);

      if (!cardTags.length) {
        tagsMap['Untagged'].push(card);
        continue;
      }

      for (const cardTag of cardTags) {
        if (cardTag in tagsMap) {
          tagsMap[cardTag].push(card);
        } else {
          tagsMap[cardTag] = [ card, ];
        }
      }
    }

    return Object.entries(tagsMap).map(([tag, cards]) => ({
      tag: tag,
      cards: cards,
    }));
  }

  filterCards() {
    let selectedTagsCardsUnion = new Set();
    for (const tagInfo of this.getTags()) {
      if (this.state.selectedTags.has(tagInfo.tag)) {
        for (const c of tagInfo.cards) {
          selectedTagsCardsUnion.add(c);
        }
      }
    }

    return this.state.cards.filter(card =>
      card.editing || this.state.selectedCategories.has(card.progress.category)
    ).filter(card => 
      card.editing || selectedTagsCardsUnion.has(card)
    );
  }

  selectAllCards() {
    this.setState({
      selectedCategories: new Set([
        'Hard', 'Medium', 'Easy',
      ]),
      selectedTags: new Set(
        this.getTags().map(t => t.tag)
      ),
    });
  }

  areAllCardsSelected() {
    return this.filterCards().length === this.state.cards.length;
  }

  handleDelete(card) {
    const cardIndex = this.state.cards.findIndex(e => e === card);

    this.notify({
      text: (<Text>Card deleted</Text>),
      action: (<Button label="Undo" onClick={() => this.setState({ cards: this.state.cards.slice(0, cardIndex).concat(card).concat(this.state.cards.slice(cardIndex)) })} />),
    });

    this.setState({
      cards: this.state.cards.filter(c => (c !== card)),
    });
  }

  handleAdd() {
    this.setState({
      cards: this.state.cards.concat({
        id: uuidv4(),
        front: "",
        back: "",
        editing: true,
        progress: {
          category: 'Hard',
        },
      }),
    });
  }

  handleEdit(card) {
    const cards = this.state.cards.map(c => (c === card ? { ...c, editing: !c.editing } : c ));
    this.setState({ cards: cards });
  }

  handleChangeFront(card, e) {
    const cards = this.state.cards.map(c => (c === card ? { ...c, front: e.target.value } : c ));
    this.setState({ cards: cards });
  }

  handleChangeBack(card, e) {
    const cards = this.state.cards.map(c => (c === card ? { ...c, back: e.target.value } : c ));
    this.setState({ cards: cards });
  }

  handleSetCategory(card, category) {
    const card_progress = { ...card.progress, category: category };
    const cards = this.state.cards.map(c => (c === card ? { ...c, progress: card_progress } : c ));
    this.setState({ cards: cards });
  }

  notify(notification) {
    const addNotification = {
      id: uuidv4(),
      text: notification.text,
      action: notification.action,
    };

    this.setState({
      notifications: this.state.notifications.concat(addNotification),
    });
  }

  render() {
    const CATEGORY_COLORMAP = {
      'Hard': 'status-error',
      'Medium': 'status-warning',
      'Easy': 'status-ok',
    };

    return (
      <Grommet theme={theme} full>
        <Box fill flex direction="column">
        
        <Header elevation="medium" background="brand" pad={{ horizontal: 'medium', vertical: 'small' }}>
          <Heading level="3" margin="none">#cards</Heading>
          <Box direction="row" gap="small">
            <Button label="Open" onClick={() => this.handleOpen()} />
            <TextInput value={this.state.boxTitle} onChange={e => this.setState({ boxTitle: e.target.value })} />
            <Button label="Save" onClick={() => this.handleSave()} />
          </Box>
          <Button primary label="Add" onClick={() => this.handleAdd()} />
        </Header>

        <Box flex={{ grow: 1, shrink: 1 }} overflow="auto" pad="medium" direction="row" wrap justify="center">
          {this.filterCards().map(card => <Flashcard
            key={card.id}
            front={card.front}
            back={card.back}
            editing={card.editing}
            onChangeFront={(e) => this.handleChangeFront(card, e)}
            onChangeBack={(e) => this.handleChangeBack(card, e)}
            footer={(
              <CardFooter background="light-2" pad={{ horizontal: 'small' }} gap="xxsmall">
                <Button icon={card.editing ? <Checkmark /> : <Edit />} hoverIndicator onClick={(e) => this.handleEdit(card) } />
                {['Hard', 'Medium', 'Easy'].map(d => (<Button
                  key={d}
                  icon={card.progress.category === d ? <RadialSelected color={CATEGORY_COLORMAP[d]} /> : <Radial color={CATEGORY_COLORMAP[d]} />}
                  hoverIndicator
                  onClick={() => this.handleSetCategory(card, d)}
                />))}
                <Button icon={<Trash />} hoverIndicator onClick={() => this.handleDelete(card)} />
              </CardFooter>
            )}
          />)}
        </Box>

        {this.state.notifications.map(n => <Toast
          key={n.id}
          text={n.text}
          action={n.action}
        />)}

        <Footer pad="small" background="light-3" elevation="medium">
          
          <Stack anchor="top-right">
            <Button
              label="All"
              primary={this.areAllCardsSelected()}
              onClick={() => this.selectAllCards()}
              margin="xsmall"
            />
            <Box className="blurred" pad={{ horizontal: 'xsmall' }} round elevation="small">
              <Text>{this.state.cards.length}</Text>
            </Box>
          </Stack>

          <Box pad="xxsmall" direction="row" gap="xxsmall" overflow="auto">

            {['Hard', 'Medium', 'Easy'].map(d => (
              <Stack key={d} anchor="top-right">
                <Button
                  primary={this.state.selectedCategories.has(d)}
                  label={d}
                  color={CATEGORY_COLORMAP[d]}
                  margin="xsmall"
                  onClick={() => this.setState({ 
                    selectedCategories: this.state.selectedCategories.has(d) ?
                      new Set([...this.state.selectedCategories].filter(c => c !== d))
                      : new Set([...this.state.selectedCategories]).add(d),
                  })}
                />
                <Box className="blurred" pad={{ horizontal: 'xsmall' }} round elevation="small">
                  <Text>{this.state.cards.filter(c => c.progress.category === d).length}</Text>
                </Box>
              </Stack>
            ))}

            {this.getTags().map(t => <Stack key={t.tag} anchor="top-right">
              <Button
                label={t.tag}
                primary={this.state.selectedTags.has(t.tag)}
                margin="xsmall"
                onClick={() => this.setState({ 
                  selectedTags: this.state.selectedTags.has(t.tag) ?
                    new Set([...this.state.selectedTags].filter(s => s !== t.tag))
                    : new Set([...this.state.selectedTags]).add(t.tag),
                })}
              />
              <Box className="blurred" pad={{ horizontal: 'xsmall' }} round elevation="small">
                <Text>{t.cards.length}</Text>
              </Box>
            </Stack>)}

          </Box>
        </Footer>
        </Box>
      </Grommet>
    );
  }

}

export default App;
